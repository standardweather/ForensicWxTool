"use client";

import Legend from "./Legend";
import ReportList from "./ReportList";
import type {
  ImagerySource,
  LayerVisibility,
  MetarObs,
  RadarSite,
  SpcReport,
} from "@/lib/types";
import {
  DEMO_EVENT,
  DEMO_EVENT_MRMS,
  GOES_PRODUCTS,
  MRMS_PRODUCTS,
  RIDGE_PRODUCTS,
} from "@/lib/types";

type Props = {
  lat: number;
  lon: number;
  datetimeLocal: string;
  onLatLonChange: (lat: number, lon: number) => void;
  onDatetimeChange: (localValue: string) => void;
  onLoad: () => void;
  onDemo: () => void;
  onDemoMrms: () => void;
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  imagerySource: ImagerySource;
  onImagerySourceChange: (s: ImagerySource) => void;
  radars: RadarSite[];
  selectedRadar: string;
  onRadarChange: (id: string) => void;
  product: string;
  onProductChange: (p: string) => void;
  imageryNote: string | null;
  lightningNote: string | null;
  spcReports: SpcReport[];
  metars: MetarObs[];
  warningCount: number;
  lsrCount: number;
  mpingNote: string | null;
  loading: boolean;
  error: string | null;
  statusLine: string | null;
};

const LAYER_LABELS: {
  key: keyof LayerVisibility;
  label: string;
  live: boolean;
}[] = [
  { key: "radar", label: "Primary imagery", live: true },
  { key: "lightning", label: "Lightning", live: false },
  { key: "warnings", label: "NWS warnings (SBW)", live: true },
  { key: "spcReports", label: "SPC storm reports", live: true },
  { key: "lsr", label: "NWS LSRs (IEM)", live: true },
  { key: "metar", label: "Nearby METARs", live: true },
  { key: "mping", label: "mPING (stub / key)", live: false },
];

function productsFor(source: ImagerySource) {
  if (source === "mrms") return MRMS_PRODUCTS;
  if (source === "goes") return GOES_PRODUCTS;
  return RIDGE_PRODUCTS;
}

export default function Sidebar(props: Props) {
  const {
    lat,
    lon,
    datetimeLocal,
    onLatLonChange,
    onDatetimeChange,
    onLoad,
    onDemo,
    onDemoMrms,
    layers,
    onToggleLayer,
    imagerySource,
    onImagerySourceChange,
    radars,
    selectedRadar,
    onRadarChange,
    product,
    onProductChange,
    imageryNote,
    lightningNote,
    spcReports,
    metars,
    warningCount,
    lsrCount,
    mpingNote,
    loading,
    error,
    statusLine,
  } = props;

  const productOpts = productsFor(imagerySource);

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
        <div className="flex flex-wrap gap-2">
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
            title={DEMO_EVENT.notes}
          >
            Demo 2013
          </button>
          <button
            type="button"
            onClick={onDemoMrms}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            title={DEMO_EVENT_MRMS.notes}
          >
            Demo MRMS
          </button>
        </div>
        {statusLine && (
          <p className="text-[10px] text-slate-400">{statusLine}</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Imagery source
        </h3>
        <label className="block text-[10px] uppercase text-slate-500">
          Source
          <select
            value={imagerySource}
            onChange={(e) =>
              onImagerySourceChange(e.target.value as ImagerySource)
            }
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
          >
            <option value="ridge">NEXRAD site (ridge)</option>
            <option value="mrms">MRMS (CONUS mosaic)</option>
            <option value="goes">Satellite (GOES East)</option>
          </select>
        </label>

        {imagerySource === "ridge" && (
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
        )}

        <label className="block text-[10px] uppercase text-slate-500">
          Product
          <select
            value={product}
            onChange={(e) => onProductChange(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
          >
            {productOpts.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {imageryNote && (
          <p className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-1.5 text-[10px] leading-snug text-amber-200/90">
            {imageryNote}
          </p>
        )}
        {imagerySource === "mrms" && !imageryNote && (
          <p className="text-[10px] text-slate-500">
            MRMS archive ≈ early 2015+. Even minutes (lcref/a2m); p1h at top of
            hour.
          </p>
        )}
        {imagerySource === "goes" && !imageryNote && (
          <p className="text-[10px] text-slate-500">
            GOES TMS is realtime/latest only via IEM (no historical timestamp
            layers).
          </p>
        )}
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
        {layers.lightning && lightningNote && (
          <p className="text-[10px] leading-snug text-amber-200/80">
            {lightningNote}
          </p>
        )}
      </div>

      <Legend imagerySource={imagerySource} product={product} />

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
