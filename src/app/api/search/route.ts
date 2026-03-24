import { NextResponse } from "next/server";
import { search, scrapeSeatMap, closeBrowser } from "@/lib/scraper";
import type { SearchParams, TheaterResult, ShowtimeDetail } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchParams;

    if (!body.area) {
      return NextResponse.json({ error: "Area is required" }, { status: 400 });
    }

    const results = await search(body);

    // Group by theater
    const theaterMap = new Map<string, TheaterResult>();

    for (const result of results) {
      const key = result.showtime.theater.name;

      if (!theaterMap.has(key)) {
        theaterMap.set(key, {
          theater: result.showtime.theater,
          movie: result.showtime.movie,
          bestScore: result.score,
          showtimes: [],
        });
      }

      const entry = theaterMap.get(key)!;
      if (result.score > entry.bestScore) {
        entry.bestScore = result.score;
      }

      entry.showtimes.push({
        time: result.showtime.dateTime,
        format: result.showtime.format,
        bookingUrl: result.showtime.bookingUrl,
        score: result.score,
        seatRecommendation: null,
        price: null,
      });
    }

    // Sort theaters by best score
    const grouped = Array.from(theaterMap.values())
      .sort((a, b) => b.bestScore - a.bestScore || a.theater.name.localeCompare(b.theater.name))
      .slice(0, 15);

    // Sort showtimes within each theater
    for (const theater of grouped) {
      theater.showtimes.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));
    }

    // Scrape seat maps for the top showtime of each of the top 5 theaters
    console.log("[api] Scraping seat maps for top theaters...");
    const seatPromises: Array<{ theaterIdx: number; showtimeIdx: number; promise: ReturnType<typeof scrapeSeatMap> }> = [];

    for (let i = 0; i < Math.min(grouped.length, 5); i++) {
      const theater = grouped[i];
      // Scrape the best showtime for each top theater
      if (theater.showtimes.length > 0) {
        seatPromises.push({
          theaterIdx: i,
          showtimeIdx: 0,
          promise: scrapeSeatMap(theater.showtimes[0].bookingUrl, body.numSeats),
        });
      }
    }

    // Run seat scraping sequentially to avoid overwhelming browser
    for (const sp of seatPromises) {
      try {
        const { recommendation, price } = await sp.promise;
        const showtime = grouped[sp.theaterIdx].showtimes[sp.showtimeIdx];
        showtime.seatRecommendation = recommendation;
        showtime.price = price;
        // Apply price to all showtimes at this theater (same pricing)
        if (price) {
          for (const st of grouped[sp.theaterIdx].showtimes) {
            if (!st.price) st.price = price;
          }
        }
        console.log(`[api] Seats for ${grouped[sp.theaterIdx].theater.name}: ${recommendation?.description || "none found"}, price: $${price?.adult || "?"}`);
      } catch (err) {
        console.log(`[api] Seat scraping failed for theater ${sp.theaterIdx}:`, err);
      }
    }

    return NextResponse.json({ results: grouped });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search for theaters. Please try again." },
      { status: 500 }
    );
  } finally {
    await closeBrowser();
  }
}
