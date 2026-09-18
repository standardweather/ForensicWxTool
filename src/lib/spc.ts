import { distanceKm, spcStormDayKey } from "./geo";
import type { SpcReport } from "./types";

const SPC_BASE = "https://www.spc.noaa.gov/climo/reports";

type Section = "tornado" | "hail" | "wind";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function hhmmToIso(dayKey: string, hhmm: string): string {
  // dayKey YYMMDD is SPC storm day starting 12Z
  const yy = Number(dayKey.slice(0, 2));
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  const month = Number(dayKey.slice(2, 4));
  const day = Number(dayKey.slice(4, 6));
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));
  // Times before 12Z are on the next calendar day relative to the storm-day date
  const d = new Date(Date.UTC(year, month - 1, day, hh, mm, 0));
  if (hh < 12) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export function spcFilteredCsvUrl(isoUtc: string): string {
  const key = spcStormDayKey(isoUtc);
  return `${SPC_BASE}/${key}_rpts_filtered.csv`;
}

export async function fetchSpcReportsNear(
  isoUtc: string,
  lat: number,
  lon: number,
  radiusKm = 250
): Promise<SpcReport[]> {
  const dayKey = spcStormDayKey(isoUtc);
  const url = spcFilteredCsvUrl(isoUtc);
  const res = await fetch(url, {
    headers: { "User-Agent": "ForensicWxTool/0.1 (educational MVP)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`SPC CSV fetch failed: ${res.status}`);
  }
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  let section: Section | null = null;
  const reports: SpcReport[] = [];
  let idx = 0;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("TIME,") && upper.includes("F_SCALE")) {
      section = "tornado";
      continue;
    }
    if (upper.startsWith("TIME,") && upper.includes("SIZE")) {
      section = "hail";
      continue;
    }
    if (upper.startsWith("TIME,") && upper.includes("SPEED")) {
      section = "wind";
      continue;
    }
    if (!section || upper.startsWith("TIME,")) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 7) continue;
    const [time, mag, location, county, state, rlat, rlon, ...rest] = cols;
    const plat = Number(rlat);
    const plon = Number(rlon);
    if (!Number.isFinite(plat) || !Number.isFinite(plon)) continue;
    const d = distanceKm(lat, lon, plat, plon);
    if (d > radiusKm) continue;

    const comments = rest.join(",").trim();
    reports.push({
      id: `spc-${section}-${dayKey}-${idx++}`,
      type: section,
      timeUtc: /^\d{4}$/.test(time) ? hhmmToIso(dayKey, time) : time,
      lat: plat,
      lon: plon,
      location: location ?? "",
      county: county ?? "",
      state: state ?? "",
      magnitude: mag && mag !== "UNK" ? mag : null,
      comments,
      distanceKm: Math.round(d * 10) / 10,
    });
  }

  return reports.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}
