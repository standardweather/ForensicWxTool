import { NextRequest, NextResponse } from "next/server";
import { iemSbwUrl } from "@/lib/iem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const time = req.nextUrl.searchParams.get("time");
  const windowMin = Number(req.nextUrl.searchParams.get("windowMin") ?? "60");

  if (!time) {
    return NextResponse.json({ error: "time required" }, { status: 400 });
  }
  const center = new Date(time);
  if (Number.isNaN(center.getTime())) {
    return NextResponse.json({ error: "invalid time" }, { status: 400 });
  }

  const half = Math.max(0, Math.min(windowMin, 360)) / 2;
  const sts = new Date(center.getTime() - half * 60_000).toISOString();
  const ets = new Date(center.getTime() + half * 60_000).toISOString();

  // Use interval so we capture warnings issued around the event, not only active-at-instant
  const url = iemSbwUrl(time, { sts, ets });

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `IEM SBW failed: ${res.status}` },
        { status: 502 }
      );
    }
    const geojson = await res.json();
    // Prefer severe convective warnings for forensic review
    const features = (geojson.features ?? []).filter(
      (f: { properties?: { phenomena?: string; significance?: string } }) => {
        const p = f.properties?.phenomena;
        const s = f.properties?.significance;
        return (
          (p === "TO" || p === "SV" || p === "FF" || p === "FA" || p === "MA") &&
          (s === "W" || s === "A")
        );
      }
    );
    return NextResponse.json({
      type: "FeatureCollection",
      features,
      source: url,
      count: features.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "warnings error" },
      { status: 500 }
    );
  }
}
