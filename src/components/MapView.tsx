"use client";

import { useEffect, useRef } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LayerVisibility, MetarObs, SpcReport } from "@/lib/types";

type Props = {
  lat: number;
  lon: number;
  onMapClick: (lat: number, lon: number) => void;
  layers: LayerVisibility;
  radar?: {
    radar: string;
    product: string;
    layerId: string | null;
  };
  warningsGeoJson: GeoJSON.FeatureCollection | null;
  spcReports: SpcReport[];
  lsrGeoJson: GeoJSON.FeatureCollection | null;
  metars: MetarObs[];
};

const WARN_COLORS: Record<string, string> = {
  TO: "#ff2020",
  SV: "#ffcc00",
  FF: "#00cc66",
  FA: "#00aa88",
  MA: "#ff66aa",
};

const SPC_COLORS: Record<string, string> = {
  tornado: "#ff3333",
  hail: "#33cc66",
  wind: "#4488ff",
};

const POPUP_STYLE =
  "background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:10px 12px;font:12px/1.45 system-ui,sans-serif;max-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.45);";

/** Esri World Dark Gray — no API key. Note Esri tile order is {z}/{y}/{x}. */
const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  name: "Esri World Dark Gray",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "esri-dark-gray": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ | OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "esri-dark-gray",
      type: "raster",
      source: "esri-dark-gray",
      minzoom: 0,
      maxzoom: 16,
    },
  ],
};

/** Deep-clone FC and strip null/undefined property values. */
function sanitizeWarningFc(
  fc: GeoJSON.FeatureCollection | null
): GeoJSON.FeatureCollection {
  if (!fc) {
    return { type: "FeatureCollection", features: [] };
  }
  const cloned = JSON.parse(JSON.stringify(fc)) as GeoJSON.FeatureCollection;
  for (const feature of cloned.features) {
    if (!feature.properties) continue;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(feature.properties)) {
      if (v !== null && v !== undefined) cleaned[k] = v;
    }
    feature.properties = cleaned;
  }
  return cloned;
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: unknown): string {
  if (value == null || value === "") return "";
  return `<div style="margin:2px 0"><span style="color:#94a3b8">${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`;
}

function spcPopupHtml(r: SpcReport): string {
  return `<div style="${POPUP_STYLE}">
    <div style="font-weight:600;margin-bottom:6px;color:#38bdf8">SPC ${escapeHtml(r.type)}</div>
    ${row("Time (UTC)", r.timeUtc)}
    ${row("Location", r.location)}
    ${row("County", r.county)}
    ${row("State", r.state)}
    ${row("Magnitude", r.magnitude)}
    ${row("Comments", r.comments)}
    ${row("Distance (km)", r.distanceKm != null ? r.distanceKm.toFixed(1) : null)}
  </div>`;
}

function lsrPopupHtml(props: Record<string, unknown>): string {
  return `<div style="${POPUP_STYLE}">
    <div style="font-weight:600;margin-bottom:6px;color:#f59e0b">LSR ${escapeHtml(props.typetext ?? props.type)}</div>
    ${row("Type", props.typetext ?? props.type)}
    ${row("City", props.city)}
    ${row("County", props.county)}
    ${row("State", props.state)}
    ${row("Valid", props.valid)}
    ${row("Magnitude", props.magnitude)}
    ${row("Remark", props.remark)}
  </div>`;
}

function metarPopupHtml(obs: MetarObs): string {
  const windParts: string[] = [];
  if (obs.drct != null) windParts.push(`${obs.drct}°`);
  if (obs.sknt != null) windParts.push(`${obs.sknt} kt`);
  if (obs.gust != null) windParts.push(`G${obs.gust}`);
  return `<div style="${POPUP_STYLE}">
    <div style="font-weight:600;margin-bottom:6px;color:#a78bfa">METAR ${escapeHtml(obs.station)}</div>
    ${row("Valid", obs.valid)}
    ${row("Temp (°F)", obs.tmpf != null ? Math.round(obs.tmpf) : null)}
    ${row("Dewpoint (°F)", obs.dwpf != null ? Math.round(obs.dwpf) : null)}
    ${row("Wind", windParts.length ? windParts.join(" ") : null)}
    ${row("Visibility", obs.vsby != null ? `${obs.vsby} mi` : null)}
    ${row("Wx", obs.wxcodes)}
    ${obs.metar ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #334155;font-family:ui-monospace,monospace;font-size:11px;word-break:break-all;color:#cbd5e1">${escapeHtml(obs.metar)}</div>` : ""}
  </div>`;
}

function makeDotEl(color: string, sizePx: number, title?: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = "1.5px solid #0b1220";
  el.style.boxShadow = "0 0 2px rgba(0,0,0,0.6)";
  el.style.cursor = "pointer";
  el.style.pointerEvents = "auto";
  if (title) el.title = title;
  return el;
}

function ringToPathD(
  map: Map,
  ring: GeoJSON.Position[]
): string | null {
  if (!ring || ring.length < 3) return null;
  const parts: string[] = [];
  for (let i = 0; i < ring.length; i++) {
    const coord = ring[i];
    if (!coord || coord.length < 2) return null;
    const lon = coord[0];
    const lat = coord[1];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const p = map.project([lon, lat]);
    parts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function warnColor(phenomena: unknown): string {
  const key = String(phenomena ?? "");
  return WARN_COLORS[key] ?? "#aaaaaa";
}

export default function MapView({
  lat,
  lon,
  onMapClick,
  layers,
  radar,
  warningsGeoJson,
  spcReports,
  lsrGeoJson,
  metars,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const overlayMarkersRef = useRef<Marker[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const readyRef = useRef(false);
  const rafDrawRef = useRef<number | null>(null);
  const onClickRef = useRef(onMapClick);
  onClickRef.current = onMapClick;

  const propsRef = useRef({
    layers,
    radar,
    warningsGeoJson,
    spcReports,
    lsrGeoJson,
    metars,
  });
  propsRef.current = {
    layers,
    radar,
    warningsGeoJson,
    spcReports,
    lsrGeoJson,
    metars,
  };

  function closePopup() {
    if (popupRef.current) {
      try {
        popupRef.current.remove();
      } catch {
        // ignore
      }
      popupRef.current = null;
    }
  }

  function openPopup(map: Map, lngLat: [number, number], html: string) {
    closePopup();
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
      className: "fwx-popup",
      offset: 12,
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);
    popupRef.current = popup;
  }

  function clearOverlayMarkers() {
    for (const m of overlayMarkersRef.current) {
      try {
        m.remove();
      } catch {
        // ignore
      }
    }
    overlayMarkersRef.current = [];
  }

  function clearWarningSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function drawWarningsSvg(map: Map) {
    const svg = svgRef.current;
    if (!svg) return;

    const { layers: L, warningsGeoJson: warnings } = propsRef.current;

    clearWarningSvg();

    if (!L.warnings || !warnings) return;

    const fc = sanitizeWarningFc(warnings);
    const container = map.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    for (const feature of fc.features) {
      const geom = feature.geometry;
      if (!geom) continue;
      const color = warnColor(feature.properties?.phenomena);
      const rings: GeoJSON.Position[][] = [];

      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) rings.push(ring);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          for (const ring of poly) rings.push(ring);
        }
      } else {
        continue;
      }

      for (const ring of rings) {
        const d = ringToPathD(map, ring);
        if (!d) continue;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", color);
        path.setAttribute("fill-opacity", "0.35");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("pointer-events", "none");
        svg.appendChild(path);
      }
    }
  }

  function scheduleDrawWarnings(map: Map) {
    if (rafDrawRef.current != null) return;
    rafDrawRef.current = requestAnimationFrame(() => {
      rafDrawRef.current = null;
      drawWarningsSvg(map);
    });
  }

  function syncOverlays(map: Map) {
    const {
      layers: L,
      radar: R,
      spcReports: spc,
      lsrGeoJson: lsr,
      metars: metarList,
    } = propsRef.current;

    // --- SVG warning polygons ---
    drawWarningsSvg(map);

    // --- Point overlays via DOM Markers ---
    clearOverlayMarkers();
    closePopup();

    if (L.spcReports) {
      for (const r of spc) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
        const color = SPC_COLORS[r.type] ?? SPC_COLORS.wind;
        const title = `SPC ${r.type}${r.magnitude ? ` ${r.magnitude}` : ""} — ${r.location || r.county || ""}`.trim();
        const el = makeDotEl(color, 12, title);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openPopup(map, [r.lon, r.lat], spcPopupHtml(r));
        });
        const m = new Marker({ element: el }).setLngLat([r.lon, r.lat]).addTo(map);
        overlayMarkersRef.current.push(m);
      }
    }

    if (L.lsr && lsr) {
      for (const f of lsr.features) {
        const g = f.geometry;
        if (!g) continue;
        let lonPt: number | undefined;
        let latPt: number | undefined;
        if (g.type === "Point") {
          lonPt = g.coordinates[0];
          latPt = g.coordinates[1];
        } else if (g.type === "MultiPoint" && g.coordinates[0]) {
          lonPt = g.coordinates[0][0];
          latPt = g.coordinates[0][1];
        }
        if (lonPt == null || latPt == null) continue;
        if (!Number.isFinite(latPt) || !Number.isFinite(lonPt)) continue;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const title = `LSR ${String(props.typetext ?? props.type ?? "")} — ${String(props.city ?? "")}`.trim();
        const el = makeDotEl("#f59e0b", 10, title);
        const lng = lonPt;
        const latPtFinal = latPt;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openPopup(map, [lng, latPtFinal], lsrPopupHtml(props));
        });
        const m = new Marker({ element: el }).setLngLat([lonPt, latPt]).addTo(map);
        overlayMarkersRef.current.push(m);
      }
    }

    if (L.metar) {
      for (const obs of metarList) {
        if (!Number.isFinite(obs.lat) || !Number.isFinite(obs.lon)) continue;
        const label = `${obs.station}${obs.tmpf != null ? ` ${Math.round(obs.tmpf)}°F` : ""}`;
        const el = makeDotEl("#a78bfa", 11, label);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openPopup(map, [obs.lon, obs.lat], metarPopupHtml(obs));
        });
        const m = new Marker({ element: el }).setLngLat([obs.lon, obs.lat]).addTo(map);
        overlayMarkersRef.current.push(m);
      }
    }

    // --- Radar: rebuild source/layer ---
    const layerId = R?.layerId;
    const radarVisible = L.radar && !!layerId && !!R;

    if (map.getLayer("radar-layer")) map.removeLayer("radar-layer");
    if (map.getSource("radar")) map.removeSource("radar");

    if (radarVisible && R && layerId) {
      const tiles = [
        `/api/radar/tile?radar=${encodeURIComponent(R.radar)}&product=${encodeURIComponent(R.product)}&time=${encodeURIComponent(layerId)}&z={z}&x={x}&y={y}`,
      ];

      map.addSource("radar", {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "IEM NEXRAD/MRMS ridge archive",
      });

      map.addLayer({
        id: "radar-layer",
        type: "raster",
        source: "radar",
        paint: { "raster-opacity": 0.75 },
      });
    }

    try {
      if (map.getLayer("radar-layer")) {
        map.moveLayer("radar-layer");
      }
    } catch {
      // Layer may not be movable yet
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [lon, lat],
      zoom: 8,
      attributionControl: {},
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120 }), "bottom-right");

    map.on("error", (e) => console.error("maplibre", e));

    // SVG overlay for warning polygons (above canvas, like DOM markers)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1";
    svg.setAttribute("aria-hidden", "true");
    containerRef.current.style.position = "relative";
    containerRef.current.appendChild(svg);
    svgRef.current = svg;

    // Dark theme tweaks for MapLibre popup chrome
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .maplibregl-popup.fwx-popup .maplibregl-popup-content {
        background: transparent;
        padding: 0;
        box-shadow: none;
      }
      .maplibregl-popup.fwx-popup .maplibregl-popup-tip {
        border-top-color: #0f172a;
        border-bottom-color: #0f172a;
      }
      .maplibregl-popup.fwx-popup .maplibregl-popup-close-button {
        color: #94a3b8;
        font-size: 16px;
        padding: 4px 8px;
      }
    `;
    document.head.appendChild(styleEl);

    markerRef.current = new Marker({ color: "#38bdf8" })
      .setLngLat([lon, lat])
      .addTo(map);

    map.on("click", (e: MapMouseEvent) => {
      closePopup();
      onClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    const onRender = () => scheduleDrawWarnings(map);
    map.on("render", onRender);

    map.on("load", () => {
      readyRef.current = true;
      syncOverlays(map);
      map.resize();
    });

    mapRef.current = map;
    return () => {
      readyRef.current = false;
      if (rafDrawRef.current != null) {
        cancelAnimationFrame(rafDrawRef.current);
        rafDrawRef.current = null;
      }
      map.off("render", onRender);
      closePopup();
      clearOverlayMarkers();
      markerRef.current?.remove();
      svgRef.current?.remove();
      svgRef.current = null;
      styleEl.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([lon, lat]);
    map.easeTo({ center: [lon, lat], duration: 600 });
  }, [lat, lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!readyRef.current) {
      // Map may already be loaded if this effect runs after load
      if (map.isStyleLoaded()) readyRef.current = true;
    }
    if (!readyRef.current) return;
    syncOverlays(map);
  }, [layers, radar, warningsGeoJson, spcReports, lsrGeoJson, metars]);

  return <div ref={containerRef} className="h-full w-full" />;
}
