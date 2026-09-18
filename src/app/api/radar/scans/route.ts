import { NextRequest, NextResponse } from "next/server";
import { iemRadarScansUrl } from "@/lib/iem";
import { scanTsToLayerId } from "@/lib/geo";
import type { RadarScan } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
      return NextResponse.json(
        { error: `IEM scans failed: ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { scans?: { ts: string }[] };
    const scans: RadarScan[] = (data.scans ?? []).map((s) => ({
      ts: s.ts,
      layerId: scanTsToLayerId(s.ts),
    }));

    // If N0Q empty, try N0Z fallback for older archives
    if (!scans.length && product === "N0Q") {
      const url2 = iemRadarScansUrl(
        radar,
        "N0Z",
        start.toISOString(),
        end.toISOString()
      );
      const res2 = await fetch(url2, { next: { revalidate: 300 } });
      if (res2.ok) {
        const data2 = (await res2.json()) as { scans?: { ts: string }[] };
        const scans2: RadarScan[] = (data2.scans ?? []).map((s) => ({
          ts: s.ts,
          layerId: scanTsToLayerId(s.ts),
        }));
        return NextResponse.json({
          scans: scans2,
          radar,
          product: "N0Z",
          source: url2,
        });
      }
    }

    return NextResponse.json({ scans, radar, product, source: url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "radar scans error" },
      { status: 500 }
    );
  }
}
