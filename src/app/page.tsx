"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import Sidebar from "@/components/Sidebar";
import TimeScrubber from "@/components/TimeScrubber";
import {
  DEMO_EVENT,
  type LayerVisibility,
  type MetarObs,
  type RadarScan,
  type RadarSite,
  type SpcReport,
} from "@/lib/types";

function toDatetimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local is in local time
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIsoUtc(localValue: string): string {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export default function HomePage() {
  const [lat, setLat] = useState(DEMO_EVENT.lat);
  const [lon, setLon] = useState(DEMO_EVENT.lon);
  const [isoTime, setIsoTime] = useState(DEMO_EVENT.datetimeUtc);
  const [datetimeLocal, setDatetimeLocal] = useState(
    toDatetimeLocalValue(DEMO_EVENT.datetimeUtc)
  );

  const [layers, setLayers] = useState<LayerVisibility>({
    radar: true,
    warnings: true,
    spcReports: true,
    lsr: true,
    metar: true,
    mping: false,
  });

  const [radars, setRadars] = useState<RadarSite[]>([]);
  const [selectedRadar, setSelectedRadar] = useState("TLX");
  const [product, setProduct] = useState("N0Q");
  const [scans, setScans] = useState<RadarScan[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeProduct, setActiveProduct] = useState("N0Q");

  const [warningsGeoJson, setWarningsGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [spcReports, setSpcReports] = useState<SpcReport[]>([]);
  const [lsrGeoJson, setLsrGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [metars, setMetars] = useState<MetarObs[]>([]);
  const [mpingNote, setMpingNote] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const currentScan = scans[scanIndex] ?? null;

  const loadEvent = useCallback(async (override?: {
    lat?: number;
    lon?: number;
    isoTime?: string;
    radar?: string;
    product?: string;
  }) => {
    const useLat = override?.lat ?? lat;
    const useLon = override?.lon ?? lon;
    const useTime = override?.isoTime ?? isoTime;
    const useProduct = override?.product ?? product;
    const useRadar = override?.radar ?? selectedRadar;

    setLoading(true);
    setError(null);
    setPlaying(false);
    setStatusLine(`Fetching archives for ${useLat.toFixed(2)}, ${useLon.toFixed(2)} @ ${useTime}`);

    try {
      const qs = new URLSearchParams({
        lat: String(useLat),
        lon: String(useLon),
        time: useTime,
      });

      const [availRes, warnRes, spcRes, lsrRes, metarRes, mpingRes] =
        await Promise.all([
          fetch(`/api/radar/available?${qs}`),
          fetch(`/api/warnings?${qs}&windowMin=90`),
          fetch(`/api/reports/spc?${qs}&radiusKm=250`),
          fetch(`/api/reports/lsr?${qs}&radiusKm=200`),
          fetch(`/api/metar?${qs}`),
          fetch(`/api/mping?${qs}`),
        ]);

      const avail = await availRes.json();
      const warn = await warnRes.json();
      const spc = await spcRes.json();
      const lsr = await lsrRes.json();
      const metar = await metarRes.json();
      const mping = await mpingRes.json();

      if (!availRes.ok) throw new Error(avail.error ?? "Radar sites failed");
      if (!warnRes.ok) throw new Error(warn.error ?? "Warnings failed");
      if (!spcRes.ok) throw new Error(spc.error ?? "SPC failed");

      const sites: RadarSite[] = avail.radars ?? [];
      setRadars(sites);

      let radarId = useRadar;
      if (!sites.find((s) => s.id === radarId)) {
        const nexrad = sites.find((s) => s.type === "NEXRAD");
        radarId = nexrad?.id ?? sites[0]?.id ?? "USCOMP";
      }
      setSelectedRadar(radarId);

      const scansQs = new URLSearchParams({
        radar: radarId,
        product: useProduct,
        time: useTime,
        windowMin: "120",
      });
      const scansRes = await fetch(`/api/radar/scans?${scansQs}`);
      const scansJson = await scansRes.json();
      if (!scansRes.ok) throw new Error(scansJson.error ?? "Radar scans failed");

      const nextScans: RadarScan[] = scansJson.scans ?? [];
      setScans(nextScans);
      setActiveProduct(scansJson.product ?? useProduct);

      // Pick scan closest to event time
      let best = 0;
      let bestDiff = Infinity;
      const target = new Date(useTime).getTime();
      nextScans.forEach((s, i) => {
        const t = new Date(s.ts).getTime();
        const diff = Math.abs(t - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i;
        }
      });
      setScanIndex(best);

      setWarningsGeoJson({
        type: "FeatureCollection",
        features: warn.features ?? [],
      });
      setSpcReports(spc.reports ?? []);
      setLsrGeoJson({
        type: "FeatureCollection",
        features: lsr.features ?? [],
      });
      setMetars(metar.observations ?? []);

      if (mping.stub) {
        setMpingNote(mping.todo ?? "Requires MPING_API_KEY — see README.");
      } else if (mping.error) {
        setMpingNote(mping.error);
      } else {
        setMpingNote(
          `${(mping.reports ?? []).length} reports (license-dependent)`
        );
      }

      setStatusLine(
        `${nextScans.length} radar frames · ${warn.count ?? warn.features?.length ?? 0} warnings · ${spc.reports?.length ?? 0} SPC · radar ${radarId}/${scansJson.product ?? useProduct}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setStatusLine(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, isoTime, product, selectedRadar]);

  // Initial load of demo event
  useEffect(() => {
    void loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload scans when radar/product changes after initial data
  useEffect(() => {
    if (!isoTime || loading) return;
    let cancelled = false;
    (async () => {
      const scansQs = new URLSearchParams({
        radar: selectedRadar,
        product,
        time: isoTime,
        windowMin: "120",
      });
      const scansRes = await fetch(`/api/radar/scans?${scansQs}`);
      const scansJson = await scansRes.json();
      if (cancelled || !scansRes.ok) return;
      const nextScans: RadarScan[] = scansJson.scans ?? [];
      setScans(nextScans);
      setActiveProduct(scansJson.product ?? product);
      setScanIndex(Math.min(scanIndex, Math.max(0, nextScans.length - 1)));
    })();
    return () => {
      cancelled = true;
    };
    // intentionally omit scanIndex/loading to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRadar, product]);

  useEffect(() => {
    if (!playing || scans.length < 2) return;
    const id = window.setInterval(() => {
      setScanIndex((i) => (i + 1) % scans.length);
    }, 500);
    return () => window.clearInterval(id);
  }, [playing, scans.length]);

  const radarProps = useMemo(
    () => ({
      radar: selectedRadar,
      product: activeProduct,
      layerId: currentScan?.layerId ?? null,
    }),
    [selectedRadar, activeProduct, currentScan]
  );

  const onMapClick = (la: number, lo: number) => {
    setLat(Number(la.toFixed(4)));
    setLon(Number(lo.toFixed(4)));
  };

  const onDemo = () => {
    setLat(DEMO_EVENT.lat);
    setLon(DEMO_EVENT.lon);
    setIsoTime(DEMO_EVENT.datetimeUtc);
    setDatetimeLocal(toDatetimeLocalValue(DEMO_EVENT.datetimeUtc));
    setSelectedRadar("TLX");
    setProduct("N0Q");
    void loadEvent({
      lat: DEMO_EVENT.lat,
      lon: DEMO_EVENT.lon,
      isoTime: DEMO_EVENT.datetimeUtc,
      radar: "TLX",
      product: "N0Q",
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="z-10 hidden h-full w-[380px] shrink-0 md:block lg:w-[400px]">
        <Sidebar
          lat={lat}
          lon={lon}
          datetimeLocal={datetimeLocal}
          onLatLonChange={(la, lo) => {
            setLat(la);
            setLon(lo);
          }}
          onDatetimeChange={(v) => {
            setDatetimeLocal(v);
            setIsoTime(localInputToIsoUtc(v));
          }}
          onLoad={() => void loadEvent()}
          onDemo={onDemo}
          layers={layers}
          onToggleLayer={(key) =>
            setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
          }
          radars={radars}
          selectedRadar={selectedRadar}
          onRadarChange={setSelectedRadar}
          product={product}
          onProductChange={setProduct}
          spcReports={spcReports}
          metars={metars}
          warningCount={warningsGeoJson?.features.length ?? 0}
          lsrCount={lsrGeoJson?.features.length ?? 0}
          mpingNote={mpingNote}
          loading={loading}
          error={error}
          statusLine={statusLine}
        />
      </div>

      <main className="relative min-w-0 flex-1">
        <MapView
          lat={lat}
          lon={lon}
          onMapClick={onMapClick}
          layers={layers}
          radar={radarProps}
          warningsGeoJson={warningsGeoJson}
          spcReports={spcReports}
          lsrGeoJson={lsrGeoJson}
          metars={metars}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 md:p-4">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <TimeScrubber
              scans={scans}
              index={scanIndex}
              onChange={setScanIndex}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
            />
          </div>
        </div>

        {/* Mobile compact controls */}
        <div className="absolute left-2 top-2 z-10 max-w-[min(100%,20rem)] rounded-lg border border-slate-700 bg-slate-950/90 p-2 md:hidden">
          <p className="text-xs font-semibold">ForensicWxTool</p>
          <p className="font-mono text-[10px] text-slate-400">
            {lat.toFixed(2)}, {lon.toFixed(2)}
          </p>
          <button
            type="button"
            className="mt-1 rounded bg-sky-600 px-2 py-1 text-[10px] text-white"
            onClick={() => void loadEvent()}
          >
            Load
          </button>
        </div>
      </main>
    </div>
  );
}
