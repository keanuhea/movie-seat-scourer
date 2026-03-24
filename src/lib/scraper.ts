import { chromium, type Browser, type Page } from "playwright";
import type { SearchParams, Showtime, ScoredResult, SeatRecommendation, PriceInfo } from "./types";

const FANDANGO_BASE = "https://www.fandango.com";

let browser: Browser | null = null;
let seatBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

async function getSeatBrowser(): Promise<Browser> {
  if (!seatBrowser) {
    seatBrowser = await chromium.launch({ headless: false });
  }
  return seatBrowser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (seatBrowser) {
    await seatBrowser.close();
    seatBrowser = null;
  }
}

async function dismissCookies(page: Page) {
  try {
    const btn = page.locator('button:has-text("Continue"), button:has-text("Accept")');
    if (await btn.first().isVisible({ timeout: 2000 })) {
      await btn.first().click();
      await page.waitForTimeout(500);
    }
  } catch {}
}

// --- Movie Search ---

interface MovieInfo {
  title: string;
  slug: string;
}

async function findMovies(page: Page, query?: string): Promise<MovieInfo[]> {
  const url = query
    ? `${FANDANGO_BASE}/search?q=${encodeURIComponent(query)}`
    : `${FANDANGO_BASE}/movies-in-theaters`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await dismissCookies(page);

  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .filter((a) => a.href.includes("/movie-overview"))
      .map((a) => {
        const parts = a.href.split("/");
        const slugIdx = parts.findIndex((p) => p.includes("movie-overview")) - 1;
        const slug = slugIdx >= 0 ? parts[slugIdx] : "";
        const title = slug
          .replace(/-\d{4}-\d+$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return { title: title || "Unknown", slug, url: a.href };
      })
      .filter((m) => m.slug && m.title !== "Unknown")
      .filter((m, i, arr) => arr.findIndex((x) => x.slug === m.slug) === i);
  });

  if (query) {
    const q = query.toLowerCase().trim();
    const special = ["early access", "prime member", "fan event", "marathon", "double feature"];
    const main = results.filter((m) => !special.some((w) => m.title.toLowerCase().includes(w)));
    const pool = main.length > 0 ? main : results;
    pool.sort((a, b) => {
      const al = a.title.toLowerCase(), bl = b.title.toLowerCase();
      if (al === q && bl !== q) return -1;
      if (bl === q && al !== q) return 1;
      if (al.startsWith(q) && !bl.startsWith(q)) return -1;
      if (bl.startsWith(q) && !al.startsWith(q)) return 1;
      return a.title.length - b.title.length;
    });
    return pool.slice(0, 1);
  }
  return results.slice(0, 5);
}

// --- Showtime Scraping ---

async function getShowtimesForMovie(
  page: Page,
  movieSlug: string,
  movieTitle: string,
  location: string,
  date: string
): Promise<Showtime[]> {
  const url = `${FANDANGO_BASE}/${movieSlug}/movie-times?location=${encodeURIComponent(location)}&date=${date}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  await dismissCookies(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const pageTitle = await page.locator("h1.movie-detail-header__title").textContent().catch(() => movieTitle);
  const resolvedTitle = pageTitle?.trim() || movieTitle;

  const raw = await page.evaluate(() => {
    const results: Array<{
      theaterName: string;
      theaterAddress: string;
      amenities: string[];
      format: string;
      time: string;
      bookingUrl: string;
    }> = [];
    const seenUrls = new Set<string>();

    document.querySelectorAll("header.shared-theater-header[id^='theater-header-']").forEach((header) => {
      const nameLink = header.querySelector("a.shared-theater-header__name-link");
      if (!nameLink) return;
      const name = nameLink.textContent?.trim() || "";
      if (!name) return;

      const ariaLabel = nameLink.getAttribute("aria-label") || "";
      const addrMatch = ariaLabel.match(/\.\s*(.+?)\.\s*This/);
      const address = addrMatch ? addrMatch[1].trim() : "";

      const container = header.parentElement;
      if (!container) return;

      container.querySelectorAll(".shared-showtimes__amenity-group").forEach((group) => {
        const amenityText = group.querySelector(".shared-showtimes__amenity-group-card-text")?.textContent?.trim() || "";
        const amenities = amenityText
          .split(",").map((a) => a.trim())
          .filter((a) => a && !a.includes("Accessibility") && !a.includes("Closed caption") && !a.includes("No passes") && !a.includes("Open caption"));

        const isPremium = group.classList.contains("thin-divider") || !!group.querySelector("[class*='premium-experience']");
        const premiumAmenities = ["IMAX", "Dolby", "Atmos", "4DX", "RPX", "ScreenX", "Laser", "HDR", "Recliner", "Dine-In"];
        const format = amenities.filter((a) => premiumAmenities.some((kw) => a.toLowerCase().includes(kw.toLowerCase()))).join(", ") || (isPremium ? "Premium" : "Standard");

        group.querySelectorAll("a.showtime-btn--available").forEach((btn) => {
          const anchor = btn as HTMLAnchorElement;
          const href = anchor.href;
          if (seenUrls.has(href) || !href.includes("tickets.fandango.com")) return;
          seenUrls.add(href);
          const time = anchor.textContent?.trim() || "";
          if (!time) return;
          results.push({ theaterName: name, theaterAddress: address, amenities, format, time, bookingUrl: href });
        });
      });
    });
    return results;
  });

  return raw.map((r) => ({
    theater: { name: r.theaterName, address: r.theaterAddress, amenities: r.amenities, chain: detectChain(r.theaterName) },
    movie: resolvedTitle,
    dateTime: r.time,
    format: r.format,
    bookingUrl: r.bookingUrl,
  }));
}

function detectChain(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("amc")) return "AMC";
  if (n.includes("regal")) return "Regal";
  if (n.includes("cinepolis")) return "Cinepolis";
  if (n.includes("alamo")) return "Alamo Drafthouse";
  if (n.includes("cinemark")) return "Cinemark";
  if (n.includes("angelika")) return "Angelika";
  if (n.includes("nitehawk")) return "Nitehawk";
  if (n.includes("metrograph")) return "Metrograph";
  if (n.includes("ifc")) return "IFC";
  return "Independent";
}

// --- Scoring ---

function scoreAmenities(amenities: string[], format: string): number {
  let score = 0;
  const text = [...amenities, format].join(" ").toLowerCase();
  if (text.includes("imax") && text.includes("laser")) score += 25;
  else if (text.includes("imax")) score += 20;
  if (text.includes("dolby") || text.includes("atmos")) score += 22;
  if (text.includes("4dx")) score += 18;
  if (text.includes("rpx")) score += 15;
  if (text.includes("screenx")) score += 14;
  if (text.includes("hdr")) score += 10;
  if (text.includes("laser")) score += 8;
  if (text.includes("recliner")) score += 12;
  if (text.includes("dine")) score += 6;
  if (text.includes("reserved")) score += 4;
  return Math.min(50, score);
}

function parseShowtime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap])/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toLowerCase();
  if (period === "p" && hours !== 12) hours += 12;
  if (period === "a" && hours === 12) hours = 0;
  return { hours, minutes };
}

function isInTimeRange(timeStr: string, fromTime: string, toTime: string): boolean {
  const parsed = parseShowtime(timeStr);
  if (!parsed) return true;
  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = toTime.split(":").map(Number);
  const show = parsed.hours * 60 + parsed.minutes;
  return show >= fromH * 60 + fromM && show <= toH * 60 + toM;
}

function matchesArea(address: string, area: string): boolean {
  if (!address) return true;
  const areaLower = area.toLowerCase();
  if (/^\d{5}$/.test(area.trim())) return true;
  const keywords: string[] = [];
  if (areaLower.includes("manhattan")) keywords.push("new york, ny");
  if (areaLower.includes("brooklyn")) keywords.push("brooklyn, ny");
  if (areaLower.includes("queens")) keywords.push("queens, ny");
  if (areaLower.includes("bronx")) keywords.push("bronx, ny");
  if (areaLower.includes("staten island")) keywords.push("staten island, ny");
  const cleaned = areaLower
    .replace(/\b(below|above|near|under|around|south of|north of|east of|west of|in|the)\b/gi, "")
    .replace(/\b\d+(st|nd|rd|th)\b\s*(street|st\.?)?/gi, "")
    .trim();
  if (cleaned && cleaned.length > 2) keywords.push(cleaned);
  if (keywords.length === 0) return true;
  const addrLower = address.toLowerCase();
  return keywords.some((kw) => addrLower.includes(kw));
}

function filterByStreetConstraint(address: string, area: string): boolean {
  const areaLower = area.toLowerCase();
  const belowMatch = areaLower.match(/(?:below|under|south of)\s+(\d+)(?:st|nd|rd|th)/);
  if (belowMatch) {
    const max = parseInt(belowMatch[1], 10);
    const m = address.match(/(?:W\.|E\.|West|East)\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) < max;
    return true;
  }
  const aboveMatch = areaLower.match(/(?:above|over|north of)\s+(\d+)(?:st|nd|rd|th)/);
  if (aboveMatch) {
    const min = parseInt(aboveMatch[1], 10);
    const m = address.match(/(?:W\.|E\.|West|East)\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) > min;
    return true;
  }
  return true;
}

// --- Main Search ---

export async function search(params: SearchParams): Promise<ScoredResult[]> {
  console.log("[scraper] Search params:", JSON.stringify(params));
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    const movies = await findMovies(page, params.movie || undefined);
    console.log("[scraper] Movies found:", movies.length, movies.map((m) => m.title));
    if (movies.length === 0) return [];

    const allShowtimes: Showtime[] = [];
    for (const movie of movies) {
      const showtimes = await getShowtimesForMovie(page, movie.slug, movie.title, params.area, params.dateFrom);
      console.log(`[scraper] Showtimes for "${movie.title}":`, showtimes.length);
      allShowtimes.push(...showtimes);
    }

    let filtered = allShowtimes.filter((s) => isInTimeRange(s.dateTime, params.timeFrom, params.timeTo));
    console.log("[scraper] After time filter:", filtered.length);

    const beforeGeo = filtered.length;
    filtered = filtered.filter((s) => matchesArea(s.theater.address, params.area) && filterByStreetConstraint(s.theater.address, params.area));
    console.log("[scraper] After geo filter:", filtered.length, `(removed ${beforeGeo - filtered.length})`);

    const results: ScoredResult[] = filtered.map((showtime) => {
      const amenityScore = scoreAmenities(showtime.theater.amenities, showtime.format);
      return { showtime, bestSeatGroup: null, score: amenityScore, scoreBreakdown: { centerScore: 0, middleRowScore: 0, amenityScore } };
    });

    results.sort((a, b) => b.score !== a.score ? b.score - a.score : a.showtime.dateTime.localeCompare(b.showtime.dateTime));
    console.log("[scraper] Final results:", results.length);
    return results;
  } finally {
    await page.close();
  }
}

// --- Seat Map Scraping (Pure HTTP — no browser needed) ---

interface RawSeat {
  id: string;
  row: number;
  column: number;
  type: string;
  status: string;
  x: number;
  y: number;
  leftNeighbor?: string;
  rightNeighbor?: string;
}

export async function scrapeSeatMap(
  bookingUrl: string,
  numSeats: number
): Promise<{ recommendation: SeatRecommendation | null; price: PriceInfo | null }> {
  const b = await getSeatBrowser();
  const page = await b.newPage();

  try {
    let seatMapJson = "";

    page.on("response", async (response) => {
      if (response.url().includes("/seat-map")) {
        try { seatMapJson = await response.text(); } catch {}
      }
    });

    await page.goto(bookingUrl, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3000);

    if (!seatMapJson) {
      console.log("[seats] No seat map API intercepted");
      return { recommendation: null, price: null };
    }

    const apiData = JSON.parse(seatMapJson);
    const seatData = apiData.data;
    if (!seatData?.seats) {
      console.log("[seats] No seat data");
      return { recommendation: null, price: null };
    }

    console.log("[seats] Got", seatData.seats.length, "seats,", seatData.totalAvailableSeatCount, "available");

    let price: PriceInfo | null = null;
    if (seatData.areas?.[0]?.ticketInfo) {
      const tickets = seatData.areas[0].ticketInfo;
      const adult = tickets.find((t: { desc: string; price: string; fee: string }) => t.desc.toLowerCase().includes("adult"));
      const child = tickets.find((t: { desc: string; price: string; fee: string }) => t.desc.toLowerCase().includes("child"));
      const senior = tickets.find((t: { desc: string; price: string; fee: string }) => t.desc.toLowerCase().includes("senior"));
      if (adult) {
        price = {
          adult: parseFloat(adult.price),
          child: child ? parseFloat(child.price) : parseFloat(adult.price),
          senior: senior ? parseFloat(senior.price) : parseFloat(adult.price),
          fee: parseFloat(adult.fee),
        };
      }
    }
    console.log("[seats] Price:", price ? `$${price.adult} + $${price.fee} fee` : "not found");

    const recommendation = findBestSeats(seatData.seats as RawSeat[], numSeats);
    console.log("[seats] Recommendation:", recommendation?.description || "none");
    return { recommendation, price };
  } catch (err) {
    console.log("[seats] Error:", err);
    return { recommendation: null, price: null };
  } finally {
    await page.close();
  }
}

// --- Seat Recommendation Algorithm ---

function findBestSeats(seats: RawSeat[], numSeats: number): SeatRecommendation | null {
  const available = seats.filter((s) => s.status === "A" && s.type === "standard");
  if (available.length < numSeats) return null;

  const rowMap = new Map<number, RawSeat[]>();
  for (const seat of available) {
    if (!rowMap.has(seat.row)) rowMap.set(seat.row, []);
    rowMap.get(seat.row)!.push(seat);
  }

  const allRows = new Set(seats.map((s) => s.row));
  const totalRows = allRows.size;
  const sortedRowNums = Array.from(allRows).sort((a, b) => a - b);

  const allColumns = seats.map((s) => s.column);
  const minCol = Math.min(...allColumns);
  const maxCol = Math.max(...allColumns);
  const centerCol = (minCol + maxCol) / 2;

  let bestGroup: { seats: RawSeat[]; score: number } | null = null;

  for (const [rowNum, rowSeats] of rowMap.entries()) {
    const rowIndex = sortedRowNums.indexOf(rowNum);
    if (rowIndex < 3) continue; // Skip first 3 rows

    const sorted = rowSeats.sort((a, b) => a.column - b.column);

    for (let i = 0; i <= sorted.length - numSeats; i++) {
      const group = sorted.slice(i, i + numSeats);

      let adjacent = true;
      for (let j = 0; j < group.length - 1; j++) {
        if (group[j].rightNeighbor !== group[j + 1].id && group[j + 1].leftNeighbor !== group[j].id) {
          if (group[j + 1].column - group[j].column !== 1) { adjacent = false; break; }
        }
      }
      if (!adjacent) continue;

      const groupCenter = group.reduce((sum, s) => sum + s.column, 0) / group.length;
      const maxOffset = (maxCol - minCol) / 2;
      const centerScore = Math.max(0, 50 * (1 - Math.abs(groupCenter - centerCol) / maxOffset));
      const idealRow = Math.floor(totalRows * 0.6);
      const rowScore = Math.max(0, 50 * (1 - Math.abs(rowIndex - idealRow) / (totalRows / 2)));
      const total = centerScore + rowScore;

      if (!bestGroup || total > bestGroup.score) {
        bestGroup = { seats: group, score: total };
      }
    }
  }

  if (!bestGroup) return null;

  const group = bestGroup.seats;
  const rowLetter = group[0].id.replace(/\d+/g, "");
  const rowIndex = sortedRowNums.indexOf(group[0].row);
  const nums = group.map((s) => parseInt(s.id.replace(/[A-Z]+/g, ""), 10));
  const range = nums.length === 1 ? `Seat ${nums[0]}` : `Seats ${Math.min(...nums)}-${Math.max(...nums)}`;

  return {
    seats: group.map((s) => s.id),
    row: rowLetter,
    rowNumber: rowIndex + 1,
    totalRows,
    score: Math.round(bestGroup.score),
    description: `Row ${rowLetter}, ${range} (row ${rowIndex + 1} of ${totalRows})`,
  };
}
