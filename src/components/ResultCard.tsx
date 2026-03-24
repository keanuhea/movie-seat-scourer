"use client";

import type { ScoredResult } from "@/lib/types";

interface ResultCardProps {
  result: ScoredResult;
  rank: number;
}

export default function ResultCard({ result, rank }: ResultCardProps) {
  const { showtime, score, scoreBreakdown } = result;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {rank}
            </span>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {showtime.movie}
            </h3>
          </div>

          <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {showtime.theater.name}
            </p>
            {showtime.theater.address && (
              <p>{showtime.theater.address}</p>
            )}
            <p>
              {showtime.dateTime}
              {showtime.format !== "Standard" && (
                <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {showtime.format}
                </span>
              )}
            </p>
          </div>

          {showtime.theater.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {showtime.theater.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {score}
          </div>
          <div className="text-xs text-zinc-400">score</div>
        </div>
      </div>

      {showtime.bookingUrl && (
        <a
          href={showtime.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-lg border border-amber-500 py-2 text-center text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
        >
          Book Tickets
        </a>
      )}
    </div>
  );
}
