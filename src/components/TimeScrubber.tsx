"use client";

import type { RadarScan } from "@/lib/types";

type Props = {
  scans: RadarScan[];
  index: number;
  onChange: (index: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
};

export default function TimeScrubber({
  scans,
  index,
  onChange,
  playing,
  onTogglePlay,
}: Props) {
  if (!scans.length) {
    return (
      <div className="rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-400">
        No radar frames for this window — try another product/site or widen time.
      </div>
    );
  }

  const current = scans[Math.min(index, scans.length - 1)];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={onTogglePlay}
        className="rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        className="text-xs text-slate-300 hover:text-white"
        onClick={() => onChange(Math.max(0, index - 1))}
      >
        ‹
      </button>
      <input
        type="range"
        min={0}
        max={scans.length - 1}
        value={Math.min(index, scans.length - 1)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-sky-500"
      />
      <button
        type="button"
        className="text-xs text-slate-300 hover:text-white"
        onClick={() => onChange(Math.min(scans.length - 1, index + 1))}
      >
        ›
      </button>
      <div className="min-w-[9.5rem] text-right font-mono text-xs text-sky-200">
        {current?.ts ?? "—"}
      </div>
      <div className="text-[10px] text-slate-500">
        {index + 1}/{scans.length}
      </div>
    </div>
  );
}
