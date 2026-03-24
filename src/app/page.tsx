"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultCard from "@/components/ResultCard";
import type { SearchParams, ScoredResult } from "@/lib/types";

export default function Home() {
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Movie Seat Scourer
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Find the best seats at the best theaters near you
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Search Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Search
              </h2>
              <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <p className="mt-4 text-sm text-zinc-500">
                  Scouring theaters for the best seats...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {!isLoading && !error && hasSearched && results.length === 0 && (
              <div className="py-20 text-center text-zinc-400">
                No results found. Try expanding your search area or date range.
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">
                  {results.length} result{results.length !== 1 ? "s" : ""} found,
                  ranked by seat quality and theater amenities
                </p>
                {results.map((result, i) => (
                  <ResultCard key={i} result={result} rank={i + 1} />
                ))}
              </div>
            )}

            {!hasSearched && (
              <div className="py-20 text-center text-zinc-400">
                <p className="text-lg">Enter your search criteria to get started</p>
                <p className="mt-2 text-sm">
                  We&apos;ll find the best available seats across theaters in your area
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
