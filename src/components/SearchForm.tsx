"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/types";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

const inputClasses =
  "mt-1.5 block w-full rounded-xl border border-stone-700/50 bg-stone-800/50 px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="area" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
          <span>📍</span> Neighborhood or zip *
        </label>
        <input
          id="area"
          type="text"
          required
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Manhattan below 60th street"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="movie" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
          <span>🎬</span> Movie <span className="text-stone-600">(optional)</span>
        </label>
        <input
          id="movie"
          type="text"
          value={movie}
          onChange={(e) => setMovie(e.target.value)}
          placeholder="Project Hail Mary"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dateFrom" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
            <span>📅</span> From
          </label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
            To
          </label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="timeFrom" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
            <span>🕐</span> Earliest
          </label>
          <input
            id="timeFrom"
            type="time"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="timeTo" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
            Latest
          </label>
          <input
            id="timeTo"
            type="time"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="numSeats" className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
          <span>💺</span> Seats together
        </label>
        <select
          id="numSeats"
          value={numSeats}
          onChange={(e) => setNumSeats(Number(e.target.value))}
          className={inputClasses}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "seat" : "seats"}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading || !area}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            Scouring...
          </span>
        ) : (
          "🔍 Find Best Seats"
        )}
      </button>
    </form>
  );
}
