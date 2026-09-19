import { NextRequest, NextResponse } from "next/server";
import { iemRadarScansUrl } from "@/lib/iem";
import { scanTsToLayerId } from "@/lib/geo";
import {
  GOES_REALTIME_WINDOW_MS,
  MRMS_ARCHIVE_START_UTC,
  type RadarScan,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toLayerId(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`
  );
}

function toScanTs(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}Z`
  );
}

/** Synthetic MRMS scan list: even minutes (lcref/a2m) or top-of-hour (p1h). */
function synthesizeMrmsScans(
  start: Date,
  end: Date,
  product: string
): RadarScan[] {
  const scans: RadarScan[] = [];
  const stepMin = product === "p1h" ? 60 : 2;
  const t = new Date(start.getTime());
  // Align to step
  const mins = t.getUTCMinutes();
  if (product === "p1h") {
    t.setUTCMinutes(0, 0, 0);
    if (t < start) t.setUTCHours(t.getUTCHours() + 1);
  } else {
    const aligned = mins % 2 === 0 ? mins : mins + 1;
    t.setUTCMinutes(aligned, 0, 0);
    if (t < start) t.setUTCMinutes(t.getUTCMinutes() + 2);
  }

  while (t <= end) {
    scans.push({ ts: toScanTs(t), layerId: toLayerId(t) });
    t.setUTCMinutes(t.getUTCMinutes() + stepMin);
  }
  return scans;
}

export async function GET(req: NextRequest) {
  const source = (req.nextUrl.searchParams.get("source") ?? "ridge").toLowerCase();
  const radar = req.nextUrl.searchParams.get("radar") ?? "USCOMP";
  const product = req.nextUrl.searchParams.get("product") ?? "N0Q";
  const time = req.nextUrl.searchParams.get("time");
  const windowMin = Number(req.nextUrl.searchParams.get("windowMin") ?? "90");

  if (!time) {
    return NextResponse.json({ error: "time required (ISO UTC)" }, { status: 400 });
  }

  const center = new Date(time);
  if (Number.isNaN(center.getTime())) {
    return NextResponse.json({ error: "invalid time" }, { status: 400 });
  }

  const half = Math.max(15, Math.min(windowMin, 360)) / 2;
  const start = new Date(center.getTime() - half * 60_000);
  const end = new Date(center.getTime() + half * 60_000);

  try {
    // ----- MRMS: synthetic even-minute / hourly list -----
    if (source === "mrms") {
      if (center.getTime() < MRMS_ARCHIVE_START_UTC) {
        return NextResponse.json({
          scans: [] as RadarScan[],
          radar: "MRMS",
          product,
          source: "mrms",
          note: "MRMS archive starts ~2015 — no tiles for this event time. Switch to NEXRAD site or pick a post-2015 demo.",
        });
      }
      const scans = synthesizeMrmsScans(start, end, product);
      return NextResponse.json({
        scans,
        radar: "MRMS",
        product,
        source: "mrms",
        note:
          product === "p1h"
            ? "MRMS p1h available at top of hour only (even minutes for lcref/a2m)."
            : undefined,
      });
    }

    // ----- GOES: realtime only (IEM has no timestamped GOES TMS) -----
    if (source === "goes") {
      const age = Math.abs(Date.now() - center.getTime());
      if (age <= GOES_REALTIME_WINDOW_MS) {
        return NextResponse.json({
          scans: [
            {
              ts: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
              layerId: "latest",
            },
          ] as RadarScan[],
          radar: "GOES-East",
          product,
          source: "goes",
          note: "Realtime/latest GOES East CONUS tiles only (IEM TMS has no historical timestamp).",
        });
      }
      return NextResponse.json({
        scans: [] as RadarScan[],
        radar: "GOES-East",
        product,
        source: "goes",
        note: "Historical GOES TMS not available for this time; realtime/latest only. IEM exposes current goes_east_conus_chXX layers without archive timestamps.",
      });
    }

    // ----- NEXRAD ridge via IEM radar.py list -----
    const url = iemRadarScansUrl(
      radar,
      product,
      start.toISOString(),
      end.toISOString()
    );
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      // Dual-pol / unsupported products sometimes 503 historically
      if (res.status === 503 || res.status === 500) {
        return NextResponse.json({
          scans: [] as RadarScan[],
          radar,
          product,
          source: "ridge",
          note: `No scans for ${radar}/${product} in this window (upstream ${res.status}). Dual-pol products are sparse historically — try N0Q, N0U, N0S, or NET.`,
        });
      }
      return NextResponse.json(
        { error: `IEM scans failed: ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { scans?: { ts: string }[] };
    let scans: RadarScan[] = (data.scans ?? []).map((s) => ({
      ts: s.ts,
      layerId: scanTsToLayerId(s.ts),
    }));
    let usedProduct = product;
    const notes: string[] = [];

    async function tryProduct(prod: string): Promise<RadarScan[]> {
      const u = iemRadarScansUrl(
        radar,
        prod,
        start.toISOString(),
        end.toISOString()
      );
      const r = await fetch(u, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!r.ok) return [];
      const d = (await r.json()) as { scans?: { ts: string }[] };
      return (d.scans ?? []).map((s) => ({
        ts: s.ts,
        layerId: scanTsToLayerId(s.ts),
      }));
    }

    // Reflectivity era shift: older archives → N0Q/N0Z; recent → N0B
    if (!scans.length && (product === "N0Q" || product === "N0Z")) {
      for (const alt of product === "N0Q" ? ["N0B", "N0Z"] : ["N0B", "N0Q"]) {
        const altScans = await tryProduct(alt);
        if (altScans.length) {
          scans = altScans;
          usedProduct = alt;
          notes.push(`${product} empty for ${radar} — fell back to ${alt}.`);
          break;
        }
      }
    }

    // If user picked N0B but only legacy N0Q exists (e.g. 2013)
    if (!scans.length && product === "N0B") {
      for (const alt of ["N0Q", "N0Z"]) {
        const altScans = await tryProduct(alt);
        if (altScans.length) {
          scans = altScans;
          usedProduct = alt;
          notes.push(`N0B empty for ${radar} — fell back to ${alt}.`);
          break;
        }
      }
    }

    // Velocity: recent sites often have N0S when N0U is empty
    if (!scans.length && product === "N0U") {
      const altScans = await tryProduct("N0S");
      if (altScans.length) {
        scans = altScans;
        usedProduct = "N0S";
        notes.push(`N0U empty for ${radar} — fell back to N0S.`);
      }
    }

    // Last resort for site reflectivity: national composite (very reliable)
    if (
      !scans.length &&
      radar !== "USCOMP" &&
      ["N0Q", "N0B", "N0Z"].includes(product)
    ) {
      const u = iemRadarScansUrl(
        "USCOMP",
        "N0Q",
        start.toISOString(),
        end.toISOString()
      );
      const r = await fetch(u, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (r.ok) {
        const d = (await r.json()) as { scans?: { ts: string }[] };
        const comp = (d.scans ?? []).map((s) => ({
          ts: s.ts,
          layerId: scanTsToLayerId(s.ts),
        }));
        if (comp.length) {
          return NextResponse.json({
            scans: comp,
            radar: "USCOMP",
            product: "N0Q",
            source: "ridge",
            note: `No ${product} (or N0B/N0Z) scans for site ${radar} in this window — fell back to USCOMP national mosaic. Single-site ridge coverage is uneven; USCOMP/MRMS are more complete.`,
            upstream: u,
          });
        }
      }
    }

    if (!scans.length) {
      return NextResponse.json({
        scans,
        radar,
        product: usedProduct,
        source: "ridge",
        note: `No scans for ${radar}/${product} in this window. Recent sites often archive N0B (not N0Q); try N0B/N0S, USCOMP, or MRMS.`,
      });
    }

    return NextResponse.json({
      scans,
      radar,
      product: usedProduct,
      source: "ridge",
      note: notes.length ? notes.join(" ") : undefined,
      upstream: url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "radar scans error" },
      { status: 500 }
    );
  }
}
