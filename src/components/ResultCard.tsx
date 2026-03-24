"use client";

import type { TheaterResult, ShowtimeDetail } from "@/lib/types";

interface ResultCardProps {
  result: TheaterResult;
  rank: number;
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function getScoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 35) return { label: "Elite", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 25) return { label: "Great", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" };
  if (score >= 15) return { label: "Good", color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/20" };
  return { label: "Standard", color: "text-stone-400", bg: "bg-stone-500/10 border-stone-500/20" };
}

function getFormatBadge(format: string): { emoji: string; color: string } {
  const f = format.toLowerCase();
  if (f.includes("imax") && f.includes("laser")) return { emoji: "⚡", color: "bg-blue-500/15 text-blue-300 border-blue-400/20" };
  if (f.includes("imax")) return { emoji: "🖥️", color: "bg-blue-500/15 text-blue-300 border-blue-400/20" };
  if (f.includes("dolby") || f.includes("atmos")) return { emoji: "🔊", color: "bg-purple-500/15 text-purple-300 border-purple-400/20" };
  if (f.includes("4dx")) return { emoji: "💨", color: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" };
  if (f.includes("rpx")) return { emoji: "✨", color: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20" };
  if (f.includes("screenx")) return { emoji: "🌐", color: "bg-indigo-500/15 text-indigo-300 border-indigo-400/20" };
  if (f.includes("recliner")) return { emoji: "🛋️", color: "bg-amber-500/15 text-amber-300 border-amber-400/20" };
  if (f.includes("laser")) return { emoji: "⚡", color: "bg-violet-500/15 text-violet-300 border-violet-400/20" };
  if (f.includes("premium")) return { emoji: "⭐", color: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20" };
  return { emoji: "🎬", color: "bg-stone-500/15 text-stone-400 border-stone-500/20" };
}

function getSeatScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-stone-400";
}

const CHAIN_COLORS: Record<string, string> = {
  AMC: "bg-red-500/10 text-red-300 border-red-500/20",
  Regal: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  "Alamo Drafthouse": "bg-orange-500/10 text-orange-300 border-orange-500/20",
  Cinemark: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Angelika: "bg-pink-500/10 text-pink-300 border-pink-500/20",
  Nitehawk: "bg-teal-500/10 text-teal-300 border-teal-500/20",
  Metrograph: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  IFC: "bg-lime-500/10 text-lime-300 border-lime-500/20",
  Independent: "bg-stone-500/10 text-stone-400 border-stone-500/20",
};

function SeatBadge({ showtime }: { showtime: ShowtimeDetail }) {
  const rec = showtime.seatRecommendation;
  if (!rec) return null;

  return (
    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">💺</span>
        <div>
          <p className="text-xs font-semibold text-emerald-300">
            Best seats: {rec.description}
          </p>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-stone-400">
            <span className={`font-medium ${getSeatScoreColor(rec.score)}`}>
              Seat score: {rec.score}/100
            </span>
            <span>
              {rec.rowNumber <= rec.totalRows * 0.4
                ? "Front section"
                : rec.rowNumber <= rec.totalRows * 0.7
                ? "Sweet spot 🎯"
                : "Back section"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceBadge({ showtime }: { showtime: ShowtimeDetail }) {
  const price = showtime.price;
  if (!price) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300">
      💲{price.adult.toFixed(2)}
      <span className="text-[10px] text-green-400/60">+ ${price.fee.toFixed(2)} fee</span>
    </span>
  );
}

export default function ResultCard({ result, rank }: ResultCardProps) {
  const { theater, bestScore, showtimes } = result;
  const chainColor = CHAIN_COLORS[theater.chain] || CHAIN_COLORS.Independent;
  const scoreInfo = getScoreLabel(bestScore);
  const rankBadge = getRankBadge(rank);

  // Group showtimes by format
  const formatGroups = new Map<string, ShowtimeDetail[]>();
  for (const st of showtimes) {
    const key = st.format;
    if (!formatGroups.has(key)) formatGroups.set(key, []);
    formatGroups.get(key)!.push(st);
  }

  const isTop3 = rank <= 3;
  // Find the showtime with a seat recommendation
  const featuredShowtime = showtimes.find((st) => st.seatRecommendation);

  return (
    <div className={`overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-xl ${
      isTop3
        ? "border-amber-500/20 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/20 shadow-lg shadow-amber-950/20"
        : "border-stone-800 bg-stone-900/60 hover:border-stone-700"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl leading-none">
            {rankBadge}
          </span>
          <div>
            <h3 className="text-base font-bold text-stone-100">
              {theater.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${chainColor}`}>
                {theater.chain}
              </span>
              {theater.address && (
                <span className="text-xs text-stone-500">{theater.address}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className={`flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2 ${scoreInfo.bg}`}>
            <div className={`text-lg font-extrabold leading-none ${scoreInfo.color}`}>
              {bestScore}
            </div>
            <div className={`text-[10px] font-medium ${scoreInfo.color}`}>
              {scoreInfo.label}
            </div>
          </div>
          {/* Price badge */}
          {showtimes[0]?.price && (
            <PriceBadge showtime={showtimes[0]} />
          )}
        </div>
      </div>

      {/* Seat Recommendation */}
      {featuredShowtime && (
        <div className="px-5 pb-1">
          <SeatBadge showtime={featuredShowtime} />
        </div>
      )}

      {/* Showtimes by format */}
      <div className="px-5 py-3 space-y-3">
        {Array.from(formatGroups.entries()).map(([format, times]) => {
          const badge = getFormatBadge(format);
          return (
            <div key={format}>
              <div className="mb-2">
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                  <span>{badge.emoji}</span>
                  {format}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {times.map((st, i) => (
                  <a
                    key={i}
                    href={st.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-lg bg-stone-800/80 px-3 py-1.5 text-sm font-medium text-stone-300 transition-all hover:-translate-y-0.5 hover:bg-amber-500/20 hover:text-amber-200 hover:shadow-md hover:shadow-amber-900/20"
                  >
                    {st.time}
                    {st.seatRecommendation && (
                      <span className="ml-1 text-emerald-400">*</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Amenities */}
      {theater.amenities.length > 0 && (
        <div className="border-t border-stone-800/50 px-5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {theater.amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-stone-800/50 px-2.5 py-0.5 text-[11px] text-stone-500"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
