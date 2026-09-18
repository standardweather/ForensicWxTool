import { NextRequest, NextResponse } from "next/server";
import { iemRadarAvailableUrl } from "@/lib/iem";
import type { RadarSite } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const time = req.nextUrl.searchParams.get("time") ?? new Date().toISOString();

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  try {
    const url = iemRadarAvailableUrl(lat, lon, time);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `IEM available failed: ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { radars?: RadarSite[] };
    const radars = (data.radars ?? []).filter(
      (r) => r.type === "NEXRAD" || r.id === "USCOMP"
    );
    // Prefer USCOMP first, then nearest NEXRAD already ordered by IEM
    radars.sort((a, b) => {
      if (a.id === "USCOMP") return -1;
      if (b.id === "USCOMP") return 1;
      return 0;
    });
    return NextResponse.json({ radars, source: url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "radar available error" },
      { status: 500 }
    );
  }
}
