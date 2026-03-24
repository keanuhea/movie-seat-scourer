"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/types";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [area, setArea] = useState("");
  const [movie, setMovie] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("23:00");
  const [numSeats, setNumSeats] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      area,
      movie: movie || undefined,
      dateFrom,
      dateTo,
      timeFrom,
      timeTo,
      numSeats,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Area */}
      <div>
        <label htmlFor="area" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Area *
        </label>
        <input
          id="area"
          type="text"
          required
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="e.g. Manhattan below 60th street"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      {/* Movie (optional) */}
      <div>
        <label htmlFor="movie" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Movie <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="movie"
          type="text"
          value={movie}
          onChange={(e) => setMovie(e.target.value)}
          placeholder="e.g. Dune Part Two"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            From Date
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            To Date
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timeFrom" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Earliest Time
          </label>
          <input
            id="timeFrom"
            type="time"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="timeTo" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Latest Time
          </label>
          <input
            id="timeTo"
            type="time"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Number of Seats */}
      <div>
        <label htmlFor="numSeats" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Number of Seats Together
        </label>
        <select
          id="numSeats"
          value={numSeats}
          onChange={(e) => setNumSeats(Number(e.target.value))}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "seat" : "seats"}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !area}
        className="w-full rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Scouring theaters..." : "Find Best Seats"}
      </button>
    </form>
  );
}
