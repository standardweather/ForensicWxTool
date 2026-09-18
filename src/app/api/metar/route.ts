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

  const sts = new Date(center.getTime() - 45 * 60_000).toISOString();
  const ets = new Date(center.getTime() + 45 * 60_000).toISOString();

  try {
    const stations = await fetchNearbyAsosStations(lat, lon);
    if (!stations.length) {
      return NextResponse.json({
        observations: [],
        note: "No nearby ASOS stations resolved from IEM networks.",
      });
    }

    const observations: MetarObs[] = [];

    await Promise.all(
      stations.slice(0, 6).map(async (st) => {
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
            metar: row.metar && row.metar !== "M" ? row.metar : null,
            distanceKm:
              Math.round(distanceKm(lat, lon, obsLat, obsLon) * 10) / 10,
          });
        }
      })
    );

    // Keep closest observation per station to event time
    const byStation = new Map<string, MetarObs>();
    for (const o of observations) {
      const prev = byStation.get(o.station);
      if (!prev) {
        byStation.set(o.station, o);
        continue;
      }
      const t0 = center.getTime();
      const parseValid = (v: string) =>
        new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z").getTime();
      const dNew = Math.abs(parseValid(o.valid) - t0);
      const dOld = Math.abs(parseValid(prev.valid) - t0);
      if (dNew < dOld) byStation.set(o.station, o);
    }

    const nearest = [...byStation.values()].sort(
      (a, b) => a.distanceKm - b.distanceKm
    );

    return NextResponse.json({
      observations: nearest,
      count: nearest.length,
      source: "IEM ASOS/METAR archive",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "metar error" },
      { status: 500 }
    );
  }
}
