"use client";

import type { MetarObs, SpcReport } from "@/lib/types";

type Props = {
  spcReports: SpcReport[];
  metars: MetarObs[];
  warningCount: number;
  lsrCount: number;
  mpingNote: string | null;
  loading: boolean;
  error: string | null;
};

export default function ReportList({
  spcReports,
  metars,
  warningCount,
  lsrCount,
  mpingNote,
  loading,
  error,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Event reports
      </h3>
      {loading && (
        <p className="text-xs text-sky-300/80">Loading archive layers…</p>
      )}
      {error && (
        <p className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-1 text-xs text-rose-200">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
        <span>Warnings: {warningCount}</span>
        <span>SPC: {spcReports.length}</span>
        <span>LSRs: {lsrCount}</span>
        <span>METARs: {metars.length}</span>
      </div>
      {mpingNote && (
        <p className="rounded border border-amber-800/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200/90">
          mPING: {mpingNote}
        </p>
      )}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {spcReports.slice(0, 40).map((r) => (
          <div
            key={r.id}
            className="rounded border border-slate-700/70 bg-slate-950/50 px-2 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-bold uppercase ${
                  r.type === "tornado"
                    ? "text-red-400"
                    : r.type === "hail"
                      ? "text-emerald-400"
                      : "text-blue-400"
                }`}
              >
                {r.type}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {r.distanceKm?.toFixed(0)} km
              </span>
            </div>
            <div className="text-xs text-slate-200">
              {r.location}, {r.state}
              {r.magnitude ? ` · ${r.magnitude}` : ""}
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              {r.timeUtc}
            </div>
            {r.comments && (
              <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">
                {r.comments}
              </p>
            )}
          </div>
        ))}
        {!loading && !spcReports.length && (
          <p className="text-xs text-slate-500">No SPC reports within radius.</p>
        )}
        {metars.length > 0 && (
          <div className="pt-2">
            <h4 className="mb-1 text-[10px] font-semibold uppercase text-violet-300/80">
              Nearby METARs
            </h4>
            {metars.map((m) => (
              <div
                key={`${m.station}-${m.valid}`}
                className="mb-1 rounded border border-violet-900/40 bg-violet-950/20 px-2 py-1"
              >
                <div className="text-xs text-violet-100">
                  {m.station} · {m.tmpf != null ? `${Math.round(m.tmpf)}°F` : "—"}
                  {m.sknt != null
                    ? ` · ${m.sknt}${m.gust != null && m.gust > m.sknt ? `G${m.gust}` : ""} kt`
                    : ""}
                  {m.drct != null ? ` @ ${m.drct}°` : ""}
                  {m.wxcodes ? ` · ${m.wxcodes}` : ""}
                </div>
                <div className="font-mono text-[10px] text-slate-500">
                  {m.valid}Z · {m.distanceKm} km
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
