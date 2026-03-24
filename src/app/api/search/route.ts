import { NextResponse } from "next/server";
import { search, closeBrowser } from "@/lib/scraper";
import type { SearchParams, TheaterResult } from "@/lib/types";

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
      });
    }

    // Sort theaters by best score, then by name
    const grouped = Array.from(theaterMap.values())
      .sort((a, b) => b.bestScore - a.bestScore || a.theater.name.localeCompare(b.theater.name))
      .slice(0, 15); // Cap at 15 theaters

    // Sort showtimes within each theater by score desc, then time
    for (const theater of grouped) {
      theater.showtimes.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));
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
