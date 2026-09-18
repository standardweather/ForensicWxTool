"use client";

import { useEffect, useRef } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type MapMouseEvent,
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

function spcColor(t: SpcReport["type"]): string {
  if (t === "tornado") return "#ff3333";
  if (t === "hail") return "#33cc66";
  return "#4488ff";
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
  const onClickRef = useRef(onMapClick);
  onClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap &copy; CARTO",
          },
        },
        layers: [
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
          },
        ],
      },
      center: [lon, lat],
      zoom: 8,
      attributionControl: {},
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ maxWidth: 120 }), "bottom-right");

    markerRef.current = new Marker({ color: "#38bdf8" })
      .setLngLat([lon, lat])
      .addTo(map);

    map.on("click", (e: MapMouseEvent) => {
      onClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      map.addSource("warnings", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "warnings-fill",
        type: "fill",
        source: "warnings",
        paint: {
          "fill-color": [
            "match",
            ["get", "phenomena"],
            "TO",
            WARN_COLORS.TO,
            "SV",
            WARN_COLORS.SV,
            "FF",
            WARN_COLORS.FF,
            "FA",
            WARN_COLORS.FA,
            "MA",
            WARN_COLORS.MA,
            "#aaaaaa",
          ],
          "fill-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "warnings-outline",
        type: "line",
        source: "warnings",
        paint: {
          "line-color": [
            "match",
            ["get", "phenomena"],
            "TO",
            WARN_COLORS.TO,
            "SV",
            WARN_COLORS.SV,
            "FF",
            WARN_COLORS.FF,
            "FA",
            WARN_COLORS.FA,
            "MA",
            WARN_COLORS.MA,
            "#aaaaaa",
          ],
          "line-width": 2,
        },
      });

      map.addSource("spc", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "spc-points",
        type: "circle",
        source: "spc",
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0b1220",
        },
      });

      map.addSource("lsr", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "lsr-points",
        type: "circle",
        source: "lsr",
        paint: {
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#111827",
        },
      });

      map.addSource("metar", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "metar-points",
        type: "circle",
        source: "metar",
        paint: {
          "circle-radius": 6,
          "circle-color": "#a78bfa",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#1e1b4b",
        },
      });
      map.addLayer({
        id: "metar-labels",
        type: "symbol",
        source: "metar",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#e9d5ff",
          "text-halo-color": "#0f0a1f",
          "text-halo-width": 1,
        },
      });
    });

    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
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

    const ensure = () => {
      const layerId = radar?.layerId;
      const visible = layers.radar && !!layerId;

      if (map.getLayer("radar-layer")) map.removeLayer("radar-layer");
      if (map.getSource("radar")) map.removeSource("radar");

      if (!visible || !radar || !layerId) return;

      const tiles = [
        `/api/radar/tile?radar=${encodeURIComponent(radar.radar)}&product=${encodeURIComponent(radar.product)}&time=${encodeURIComponent(layerId)}&z={z}&x={x}&y={y}`,
      ];

      map.addSource("radar", {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "IEM NEXRAD/MRMS ridge archive",
      });

      map.addLayer(
        {
          id: "radar-layer",
          type: "raster",
          source: "radar",
          paint: { "raster-opacity": 0.75 },
        },
        map.getLayer("warnings-fill") ? "warnings-fill" : undefined
      );
    };

    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
  }, [radar, layers.radar]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("warnings") as GeoJSONSource | undefined;
      if (!src) return;
      src.setData(
        layers.warnings && warningsGeoJson
          ? warningsGeoJson
          : { type: "FeatureCollection", features: [] }
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [warningsGeoJson, layers.warnings]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("spc") as GeoJSONSource | undefined;
      if (!src) return;
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: layers.spcReports
          ? spcReports.map((r) => ({
              type: "Feature",
              properties: {
                ...r,
                color: spcColor(r.type),
              },
              geometry: { type: "Point", coordinates: [r.lon, r.lat] },
            }))
          : [],
      };
      src.setData(fc);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [spcReports, layers.spcReports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("lsr") as GeoJSONSource | undefined;
      if (!src) return;
      src.setData(
        layers.lsr && lsrGeoJson
          ? lsrGeoJson
          : { type: "FeatureCollection", features: [] }
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [lsrGeoJson, layers.lsr]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("metar") as GeoJSONSource | undefined;
      if (!src) return;
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: layers.metar
          ? metars.map((m) => ({
              type: "Feature",
              properties: {
                label: `${m.station}${m.tmpf != null ? ` ${Math.round(m.tmpf)}°F` : ""}`,
                ...m,
              },
              geometry: { type: "Point", coordinates: [m.lon, m.lat] },
            }))
          : [],
      };
      src.setData(fc);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [metars, layers.metar]);

  return <div ref={containerRef} className="h-full w-full" />;
}
