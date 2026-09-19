import { NextRequest, NextResponse } from "next/server";
import { distanceKm } from "@/lib/geo";
import { fetchNearbyAsosStations, iemAsosUrl } from "@/lib/iem";
import type { MetarObs } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseNum(v: string | undefined): number | null {
  if (v == null || v === "" || v === "M" || v === "null") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseReportType(
  metar: string | null
): MetarObs["reportType"] {
  if (!metar) return "unknown";
  if (/\bSPECI\b/i.test(metar)) return "SPECI";
  if (/\bMETAR\b/i.test(metar)) return "METAR";
  return "unknown";
}

function parseValidMs(v: string): number {
  if (!v) return NaN;
  if (v.includes("T")) {
    return new Date(v.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(v) ? v : `${v}Z`).getTime();
  }
  // IEM ASOS CSV: "YYYY-MM-DD HH:MM" (UTC)
  return new Date(`${v.replace(" ", "T")}Z`).getTime();
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const time = req.nextUrl.searchParams.get("time");

  if (!time || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat, lon, time required" },
      { status: 400 }
    );
  }

  const center = new Date(time);
  if (Number.isNaN(center.getTime())) {
    return NextResponse.json({ error: "invalid time" }, { status: 400 });
  }

  // Wide window so radar scrubbing can pick nearest obs per frame
  const windowMin = 120;
  const sts = new Date(center.getTime() - windowMin * 60_000).toISOString();
  const ets = new Date(center.getTime() + windowMin * 60_000).toISOString();

  try {
    const stations = await fetchNearbyAsosStations(lat, lon);
    if (!stations.length) {
      return NextResponse.json({
        observations: [],
        count: 0,
        note: "No nearby ASOS stations resolved from IEM networks.",
        source: "IEM ASOS/METAR archive",
      });
    }

    const observations: MetarObs[] = [];

    await Promise.all(
      stations.slice(0, 12).map(async (st) => {
        const url = iemAsosUrl({ station: st.id, sts, ets });
        const res = await fetch(url, {
          headers: { Accept: "text/plain" },
          next: { revalidate: 600 },
        });
        if (!res.ok) return;
        const text = await res.text();
        const lines = text
          .split(/\r?\n/)
          .filter((l) => l && !l.startsWith("#"));
        let header: string[] | null = null;
        for (const line of lines) {
          if (!header) {
            if (line.startsWith("station,")) {
              header = line.split(",");
            }
            continue;
          }
          const cols = line.split(",");
          if (cols.length < header.length) continue;
          const row: Record<string, string> = {};
          header.forEach((h, i) => {
            row[h] = cols[i] ?? "";
          });
          const obsLat = parseNum(row.lat) ?? st.lat;
          const obsLon = parseNum(row.lon) ?? st.lon;
          const metar =
            row.metar && row.metar !== "M" ? row.metar : null;
          observations.push({
            station: row.station || st.id,
            valid: row.valid,
            lat: obsLat,
            lon: obsLon,
            tmpf: parseNum(row.tmpf),
            dwpf: parseNum(row.dwpf),
            sknt: parseNum(row.sknt),
            gust: parseNum(row.gust),
            drct: parseNum(row.drct),
            vsby: parseNum(row.vsby),
            wxcodes: row.wxcodes && row.wxcodes !== "M" ? row.wxcodes : null,
            metar,
            distanceKm:
              Math.round(distanceKm(lat, lon, obsLat, obsLon) * 10) / 10,
            reportType: parseReportType(metar),
          });
        }
      })
    );

    // Return full series (all obs in window) for client-side time matching
    observations.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      const ta = parseValidMs(a.valid);
      const tb = parseValidMs(b.valid);
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
    });

    return NextResponse.json({
      observations,
      count: observations.length,
      source: "IEM ASOS/METAR archive",
      windowMin,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "metar error" },
      { status: 500 }
    );
  }
}
