import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * mPING requires an API token (https://mping.ou.edu/api/).
 * Historical archive access needs a Research/Commercial license.
 * This route is intentionally stubbed until MPING_API_KEY is configured.
 */
export async function GET(req: NextRequest) {
  const key = process.env.MPING_API_KEY;
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  const time = req.nextUrl.searchParams.get("time");

  if (!key) {
    return NextResponse.json({
      reports: [],
      stub: true,
      todo: "Set MPING_API_KEY (Research/Commercial license) to enable historical mPING queries. See README.",
      docs: "https://mping.ou.edu/api/",
      requested: { lat, lon, time },
    });
  }

  // Optional live path if a key is present — limited by license terms
  try {
    const center = time ? new Date(time) : new Date();
    const gte = new Date(center.getTime() - 3 * 3600_000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    const lte = new Date(center.getTime() + 3 * 3600_000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    const url = new URL("https://mping.ou.edu/mping/api/v2/reports");
    url.searchParams.set("obtime_gte", gte);
    url.searchParams.set("obtime_lte", lte);
    if (lat && lon) {
      // ~1 degree bbox around point
      const la = Number(lat);
      const lo = Number(lon);
      url.searchParams.set(
        "in_bbox",
        `${lo - 1},${la - 1},${lo + 1},${la + 1}`
      );
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Token ${key}`,
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `mPING upstream ${res.status}`, stub: false },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json({
      reports: data.results ?? data,
      stub: false,
      source: "mPING API v2",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "mping error", stub: false },
      { status: 500 }
    );
  }
}
