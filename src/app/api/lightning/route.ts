import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightning layer stub.
 *
 * Free historical lightning with a simple tile/GeoJSON API is scarce.
 * IEM /geojson/lightning.geojson and /json/lightning.py redirect to /api/
 * without a usable public historical flash feed. GLM (GOES) and NLDN
 * typically need licensed or heavier archive integration (e.g. AWS Open
 * Data GLM flashes).
 *
 * TODO: Integrate AWS GLM flash archive (or licensed NLDN) for
 * time+bbox queries; return GeoJSON Point features as `flashes`.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  const time = req.nextUrl.searchParams.get("time");

  return NextResponse.json({
    flashes: [],
    stub: true,
    note: "No free historical lightning tile/GeoJSON verified. GLM/NLDN need a licensed or heavier archive integration.",
    todo: "Wire AWS Open Data GLM flashes (or licensed NLDN) for time+bbox → GeoJSON points. Do not invent flash locations.",
    requested: { lat, lon, time },
  });
}
