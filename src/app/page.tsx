"use client";

import { useState, useEffect } from "react";
import SearchForm from "@/components/SearchForm";
import ResultCard from "@/components/ResultCard";
import type { SearchParams, TheaterResult } from "@/lib/types";

const LOADING_MESSAGES = [
  "Sneaking into theaters...",
  "Checking every seat...",
  "Judging the recliners...",
  "Rating the screens...",
  "Scouting the best spots...",
  "Finding center seats...",
  "Measuring legroom...",
  "Sniffing out the IMAX...",
];

export default function Home() {
  const [results, setResults] = useState<TheaterResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (!isLoading) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  async function handleSearch(params: SearchParams) {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      {/* Header with gradient */}
      <header className="relative overflow-hidden border-b border-amber-900/20">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-red-950/20" />
        <div className="relative mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center gap-3.5">
            <div className="text-3xl animate-float">🍿</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 bg-clip-text text-transparent">
                Movie Seat Scourer
              </h1>
              <p className="text-xs text-amber-200/40">
                Because life&apos;s too short for bad seats
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Search Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-8 rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/80 to-stone-900/40 p-6 backdrop-blur shadow-xl shadow-amber-950/10">
              <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-amber-200/60">
                <span>🔍</span> What are you looking for?
              </h2>
              <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                  <div className="text-5xl animate-float">🎬</div>
                </div>
                <p className="mt-5 text-sm font-medium text-amber-300/70">
                  {loadingMsg}
                </p>
                <div className="mt-3 h-1 w-48 overflow-hidden rounded-full bg-stone-800">
                  <div className="h-full w-full animate-shimmer rounded-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" style={{ backgroundSize: "200% 100%" }} />
                </div>
                <p className="mt-3 text-xs text-stone-600">
                  Hang tight, we&apos;re scraping real showtime data
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-800/30 bg-red-950/20 p-5 text-sm text-red-400">
                <span className="mr-2">😬</span>{error}
              </div>
            )}

            {!isLoading && !error && hasSearched && results.length === 0 && (
              <div className="py-24 text-center">
                <div className="text-4xl">🦗</div>
                <p className="mt-4 text-stone-400">No results found</p>
                <p className="mt-1 text-sm text-stone-600">
                  Try a different area, movie, or date range
                </p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-950/30 to-transparent px-4 py-3">
                  <p className="text-sm font-medium text-amber-200/70">
                    🎯 {results.length} theater{results.length !== 1 ? "s" : ""} ranked
                  </p>
                  <p className="text-xs text-stone-500">
                    Best experience first
                  </p>
                </div>
                {results.map((result, i) => (
                  <div
                    key={result.theater.name}
                    className="animate-pop-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <ResultCard result={result} rank={i + 1} />
                  </div>
                ))}
              </div>
            )}

            {!hasSearched && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl animate-float">🎥</div>
                <p className="mt-6 text-lg font-medium text-stone-300">
                  Ready to find your perfect seat?
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
                  Tell us where you want to go and we&apos;ll rank every theater
                  by screen quality, recliners, IMAX, Dolby, and more
                </p>
                <div className="mt-6 flex gap-2 text-xs text-stone-600">
                  <span className="rounded-full bg-stone-800/50 px-3 py-1">IMAX</span>
                  <span className="rounded-full bg-stone-800/50 px-3 py-1">Dolby Atmos</span>
                  <span className="rounded-full bg-stone-800/50 px-3 py-1">Recliners</span>
                  <span className="rounded-full bg-stone-800/50 px-3 py-1">4DX</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
