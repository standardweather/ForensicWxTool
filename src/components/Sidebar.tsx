"use client";

import Legend from "./Legend";
import ReportList from "./ReportList";
import type { LayerVisibility, MetarObs, RadarSite, SpcReport } from "@/lib/types";
import { DEMO_EVENT } from "@/lib/types";

type Props = {
  lat: number;
  lon: number;
  datetimeLocal: string;
  onLatLonChange: (lat: number, lon: number) => void;
  onDatetimeChange: (localValue: string) => void;
  onLoad: () => void;
  onDemo: () => void;
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  radars: RadarSite[];
  selectedRadar: string;
  onRadarChange: (id: string) => void;
  product: string;
  onProductChange: (p: string) => void;
  spcReports: SpcReport[];
  metars: MetarObs[];
  warningCount: number;
  lsrCount: number;
  mpingNote: string | null;
  loading: boolean;
  error: string | null;
  statusLine: string | null;
};

const LAYER_LABELS: { key: keyof LayerVisibility; label: string; live: boolean }[] = [
  { key: "radar", label: "Archived radar (IEM)", live: true },
  { key: "warnings", label: "NWS warnings (SBW)", live: true },
  { key: "spcReports", label: "SPC storm reports", live: true },
  { key: "lsr", label: "NWS LSRs (IEM)", live: true },
  { key: "metar", label: "Nearby METARs", live: true },
  { key: "mping", label: "mPING (stub / key)", live: false },
];

export default function Sidebar(props: Props) {
  const {
    lat,
    lon,
    datetimeLocal,
    onLatLonChange,
    onDatetimeChange,
    onLoad,
    onDemo,
    layers,
    onToggleLayer,
    radars,
    selectedRadar,
    onRadarChange,
    product,
    onProductChange,
    spcReports,
    metars,
    warningCount,
    lsrCount,
    mpingNote,
    loading,
    error,
    statusLine,
  } = props;

  return (
    <aside className="flex h-full w-full max-w-md flex-col gap-3 overflow-hidden border-r border-slate-800 bg-slate-950/95 p-4 text-slate-100 shadow-xl">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          ForensicWxTool
        </h1>
        <p className="text-xs text-slate-400">
          Archive radar, warnings &amp; storm reports for past events
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] uppercase text-slate-500">
            Latitude
            <input
              type="number"
              step="0.01"
              value={lat}
              onChange={(e) => onLatLonChange(Number(e.target.value), lon)}
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm"
            />
          </label>
          <label className="block text-[10px] uppercase text-slate-500">
            Longitude
            <input
              type="number"
              step="0.01"
              value={lon}
              onChange={(e) => onLatLonChange(lat, Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm"
            />
          </label>
        </div>
        <label className="block text-[10px] uppercase text-slate-500">
          Date/time (local browser → stored as UTC ISO)
          <input
            type="datetime-local"
            value={datetimeLocal}
            onChange={(e) => onDatetimeChange(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm"
          />
        </label>
        <p className="text-[10px] text-slate-500">
          Tip: click the map to set lat/lon. Demo: {DEMO_EVENT.name}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLoad}
            disabled={loading}
            className="flex-1 rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load event"}
          </button>
          <button
            type="button"
            onClick={onDemo}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Demo
          </button>
        </div>
        {statusLine && (
          <p className="text-[10px] text-slate-400">{statusLine}</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Radar source
        </h3>
        <label className="block text-[10px] uppercase text-slate-500">
          Site
          <select
            value={selectedRadar}
            onChange={(e) => onRadarChange(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
          >
            {radars.length === 0 && <option value="USCOMP">USCOMP</option>}
            {radars.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] uppercase text-slate-500">
          Product
          <select
            value={product}
            onChange={(e) => onProductChange(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
          >
            <option value="N0Q">N0Q Base Reflectivity (hi-res)</option>
            <option value="N0Z">N0Z Base Reflectivity</option>
            <option value="N0U">N0U Base Velocity</option>
            <option value="N0S">N0S Storm-Relative Velocity</option>
          </select>
        </label>
      </div>

      <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Layers
        </h3>
        {LAYER_LABELS.map((l) => (
          <label
            key={l.key}
            className="flex cursor-pointer items-center justify-between gap-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layers[l.key]}
                onChange={() => onToggleLayer(l.key)}
                className="accent-sky-500"
              />
              {l.label}
            </span>
            <span
              className={`text-[9px] uppercase ${l.live ? "text-emerald-500" : "text-amber-500"}`}
            >
              {l.live ? "live" : "stub"}
            </span>
          </label>
        ))}
      </div>

      <Legend />

      <ReportList
        spcReports={spcReports}
        metars={metars}
        warningCount={warningCount}
        lsrCount={lsrCount}
        mpingNote={mpingNote}
        loading={loading}
        error={error}
      />
    </aside>
  );
}
