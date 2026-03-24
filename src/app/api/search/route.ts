import { NextResponse } from "next/server";
import { search, closeBrowser } from "@/lib/scraper";
import type { SearchParams } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchParams;

    if (!body.area) {
      return NextResponse.json({ error: "Area is required" }, { status: 400 });
    }

    const results = await search(body);

    return NextResponse.json({ results });
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
