import { chromium, type Browser, type Page } from "playwright";
import type { SearchParams, Theater, Showtime, ScoredResult } from "./types";

const FANDANGO_BASE = "https://www.fandango.com";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function dismissCookies(page: Page) {
  try {
    const btn = page.locator(
      'button:has-text("Continue"), button:has-text("Accept")'
    );
    if (await btn.first().isVisible({ timeout: 2000 })) {
      await btn.first().click();
      await page.waitForTimeout(500);
    }
  } catch {}
}

interface MovieInfo {
  title: string;
  slug: string;
  url: string;
}

async function findMovies(
  page: Page,
  query?: string
): Promise<MovieInfo[]> {
  const sourceUrl = query
    ? `${FANDANGO_BASE}/search?q=${encodeURIComponent(query)}`
    : `${FANDANGO_BASE}/movies-in-theaters`;

  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  await dismissCookies(page);

  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .filter((a) => a.href.includes("/movie-overview"))
      .map((a) => {
        const href = a.href;
        const parts = href.split("/");
        const slugIndex = parts.findIndex((p) => p.includes("movie-overview")) - 1;
        const slug = slugIndex >= 0 ? parts[slugIndex] : "";
        const titleFromSlug = slug
          .replace(/-\d{4}-\d+$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return { title: titleFromSlug || "Unknown", slug, url: href };
      })
      .filter((m) => m.slug && m.title !== "Unknown")
      .filter((m, i, arr) => arr.findIndex((x) => x.slug === m.slug) === i);
  });

  // If searching for a specific movie, only return the best match
  if (query) {
    const queryLower = query.toLowerCase();
    // Sort by relevance: exact match first, then starts-with, then contains
    results.sort((a, b) => {
      const aLower = a.title.toLowerCase();
      const bLower = b.title.toLowerCase();
      const aExact = aLower === queryLower ? 0 : 1;
      const bExact = bLower === queryLower ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = aLower.startsWith(queryLower) ? 0 : 1;
      const bStarts = bLower.startsWith(queryLower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aContains = aLower.includes(queryLower) ? 0 : 1;
      const bContains = bLower.includes(queryLower) ? 0 : 1;
      return aContains - bContains;
    });
    return results.slice(0, 1); // Only the best match
  }

  return results.slice(0, 5);
}

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

  // Scroll to load all theaters
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  // Get the actual movie title from the page header
  const pageTitle = await page
    .locator("h1.movie-detail-header__title")
    .textContent()
    .catch(() => movieTitle);
  const resolvedTitle = pageTitle?.trim() || movieTitle;

  const rawShowtimes = await page.evaluate(() => {
    const results: Array<{
      theaterName: string;
      theaterAddress: string;
      theaterDistance: string;
      amenities: string[];
      format: string;
      time: string;
      bookingUrl: string;
    }> = [];

    const seenUrls = new Set<string>();

    // Find theater containers by their unique header IDs
    const theaterHeaderEls = document.querySelectorAll(
      "header.shared-theater-header[id^='theater-header-']"
    );

    theaterHeaderEls.forEach((header) => {
      const nameLink = header.querySelector("a.shared-theater-header__name-link");
      if (!nameLink) return;

      const name = nameLink.textContent?.trim() || "";
      if (!name) return;

      // Extract address from aria-label
      const ariaLabel = nameLink.getAttribute("aria-label") || "";
      const addressMatch = ariaLabel.match(/\.\s*(.+?)\.\s*This/);
      const address = addressMatch ? addressMatch[1].trim() : "";

      // Distance
      const distEl = header.querySelector(".shared-theater-header__distance");
      const distance = distEl?.textContent?.trim() || "";

      const theaterContainer = header.parentElement;
      if (!theaterContainer) return;

      // Find amenity groups — each has its own amenities + showtime buttons
      const amenityGroups = theaterContainer.querySelectorAll(
        ".shared-showtimes__amenity-group"
      );

      amenityGroups.forEach((group) => {
        // Get amenities text from the card
        const amenityTextEl = group.querySelector(
          ".shared-showtimes__amenity-group-card-text"
        );
        const amenityText = amenityTextEl?.textContent?.trim() || "";
        const amenities = amenityText
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a && !a.includes("Accessibility") && !a.includes("Closed caption") && !a.includes("No passes") && !a.includes("Open caption"));

        // Determine format: check if this group is under Premium or Standard
        const isPremium = group.classList.contains("thin-divider") ||
          !!group.closest("[class*='premium']") ||
          group.querySelector("[class*='premium-experience']") !== null;
        const format = isPremium ? "Premium" : "Standard";

        // Get available showtime buttons
        const buttons = group.querySelectorAll("a.showtime-btn--available");
        buttons.forEach((btn) => {
          const anchor = btn as HTMLAnchorElement;
          const href = anchor.href;

          if (seenUrls.has(href)) return;
          seenUrls.add(href);
          if (!href.includes("tickets.fandango.com")) return;

          const time = anchor.textContent?.trim() || "";
          if (!time) return;

          results.push({
            theaterName: name,
            theaterAddress: address,
            theaterDistance: distance,
            amenities,
            format: amenities.length > 0
              ? amenities.filter(a =>
                  ["IMAX", "Dolby", "Atmos", "4DX", "RPX", "ScreenX", "Laser", "HDR", "Recliner", "Dine-In"].some(kw =>
                    a.toLowerCase().includes(kw.toLowerCase())
                  )
                ).join(", ") || format
              : format,
            time,
            bookingUrl: href,
          });
        });
      });
    });

    return results;
  });

  return rawShowtimes.map((raw) => ({
    theater: {
      name: raw.theaterName,
      address: raw.theaterAddress,
      amenities: raw.amenities,
      chain: detectChain(raw.theaterName),
    },
    movie: resolvedTitle,
    dateTime: raw.time,
    format: raw.format,
    bookingUrl: raw.bookingUrl,
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

// Score amenities for ranking — premium formats get higher scores
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

  return Math.min(50, score); // Cap at 50
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

  const showMinutes = parsed.hours * 60 + parsed.minutes;
  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;

  return showMinutes >= fromMinutes && showMinutes <= toMinutes;
}

// Geographic filtering: check if a theater address is within the user's specified area
function matchesArea(address: string, area: string): boolean {
  if (!address) return true; // include if we can't determine

  const areaLower = area.toLowerCase();

  // If the area is just a zip code, skip filtering (Fandango already filters by proximity)
  if (/^\d{5}$/.test(area.trim())) return true;

  // Extract city/state/neighborhood keywords from the area description
  const areaKeywords = extractAreaKeywords(areaLower);
  const addrLower = address.toLowerCase();

  // Check if address matches any of the area keywords
  return areaKeywords.some((kw) => addrLower.includes(kw));
}

function extractAreaKeywords(area: string): string[] {
  const keywords: string[] = [];

  // Common NYC area mappings
  if (area.includes("manhattan")) {
    keywords.push("new york, ny");
  }
  if (area.includes("brooklyn")) {
    keywords.push("brooklyn, ny");
  }
  if (area.includes("queens")) {
    keywords.push("queens, ny");
  }
  if (area.includes("bronx")) {
    keywords.push("bronx, ny");
  }
  if (area.includes("staten island")) {
    keywords.push("staten island, ny");
  }

  // Also try the raw area as a keyword
  // Strip common words like "below", "above", "near", "under", "around"
  const cleaned = area
    .replace(/\b(below|above|near|under|around|south of|north of|east of|west of|in|the)\b/gi, "")
    .replace(/\b\d+(st|nd|rd|th)\b\s*(street|st\.?)?/gi, "")
    .trim();
  if (cleaned && cleaned.length > 2) {
    keywords.push(cleaned);
  }

  // If no keywords extracted, be permissive
  if (keywords.length === 0) {
    return [area.trim()];
  }

  return keywords;
}

// For Manhattan-specific queries, filter by street number
function filterByStreetConstraint(address: string, area: string): boolean {
  const areaLower = area.toLowerCase();

  // Check for "below Xth street" or "under Xth street" pattern
  const belowMatch = areaLower.match(/(?:below|under|south of)\s+(\d+)(?:st|nd|rd|th)/);
  if (belowMatch) {
    const maxStreet = parseInt(belowMatch[1], 10);
    // Try to extract street number from address
    const streetMatch = address.match(/(\d+)(?:st|nd|rd|th)\s+st/i);
    if (streetMatch) {
      const streetNum = parseInt(streetMatch[1], 10);
      return streetNum < maxStreet;
    }
    // For addresses like "312 W. 34th St." — extract the street name number
    const streetMatch2 = address.match(/(?:W\.|E\.|West|East)\s*(\d+)/i);
    if (streetMatch2) {
      const streetNum = parseInt(streetMatch2[1], 10);
      return streetNum < maxStreet;
    }
    // For Broadway addresses with a number, we can't determine the cross street
    // so include them
    return true;
  }

  // Check for "above Xth street" pattern
  const aboveMatch = areaLower.match(/(?:above|over|north of)\s+(\d+)(?:st|nd|rd|th)/);
  if (aboveMatch) {
    const minStreet = parseInt(aboveMatch[1], 10);
    const streetMatch = address.match(/(?:W\.|E\.|West|East)\s*(\d+)/i);
    if (streetMatch) {
      const streetNum = parseInt(streetMatch[1], 10);
      return streetNum > minStreet;
    }
    return true;
  }

  return true;
}

export async function search(params: SearchParams): Promise<ScoredResult[]> {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    // Step 1: Find movies
    const movies = await findMovies(page, params.movie || undefined);
    if (movies.length === 0) return [];

    // Step 2: Get showtimes
    const allShowtimes: Showtime[] = [];
    for (const movie of movies) {
      const showtimes = await getShowtimesForMovie(
        page,
        movie.slug,
        movie.title,
        params.area,
        params.dateFrom
      );
      allShowtimes.push(...showtimes);
    }

    // Step 3: Filter by time range
    let filtered = allShowtimes.filter((s) =>
      isInTimeRange(s.dateTime, params.timeFrom, params.timeTo)
    );

    // Step 4: Filter by geographic area
    filtered = filtered.filter(
      (s) =>
        matchesArea(s.theater.address, params.area) &&
        filterByStreetConstraint(s.theater.address, params.area)
    );

    // Step 5: Score and rank
    const results: ScoredResult[] = filtered.map((showtime) => {
      const amenityScore = scoreAmenities(
        showtime.theater.amenities,
        showtime.format
      );

      return {
        showtime,
        bestSeatGroup: null,
        score: amenityScore,
        scoreBreakdown: {
          centerScore: 0,
          middleRowScore: 0,
          amenityScore,
        },
      };
    });

    // Sort by score descending, then by time
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.showtime.dateTime.localeCompare(b.showtime.dateTime);
    });

    return results;
  } finally {
    await page.close();
  }
}
