import { NextRequest, NextResponse } from "next/server";
import { fetchSpcReportsNear } from "@/lib/spc";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const time = req.nextUrl.searchParams.get("time");
  const radiusKm = Number(req.nextUrl.searchParams.get("radiusKm") ?? "250");

  if (!time || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat, lon, time required" },
      { status: 400 }
    );
  }

  try {
    const reports = await fetchSpcReportsNear(time, lat, lon, radiusKm);
    return NextResponse.json({
      reports,
      count: reports.length,
      source: "SPC filtered daily CSV via server proxy",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "spc error" },
      { status: 502 }
    );
  }
}
