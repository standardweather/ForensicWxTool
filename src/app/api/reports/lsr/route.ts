import { NextRequest, NextResponse } from "next/server";
import { bboxAround } from "@/lib/geo";
import { iemLsrUrl } from "@/lib/iem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const time = req.nextUrl.searchParams.get("time");
  const radiusKm = Number(req.nextUrl.searchParams.get("radiusKm") ?? "200");

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

  // SPC day-ish window around event
  const sts = new Date(center.getTime() - 6 * 3600_000).toISOString();
  const ets = new Date(center.getTime() + 6 * 3600_000).toISOString();
  const box = bboxAround(lat, lon, radiusKm);
  const url = iemLsrUrl({ ...box, sts, ets });

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `IEM LSR failed: ${res.status}` },
        { status: 502 }
      );
    }
    const geojson = await res.json();
    return NextResponse.json({
      ...geojson,
      source: url,
      count: geojson.features?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lsr error" },
      { status: 500 }
    );
  }
}
