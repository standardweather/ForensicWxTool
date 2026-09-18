import { NextRequest, NextResponse } from "next/server";
import { iemRadarTileUrl } from "@/lib/iem";

export const dynamic = "force-dynamic";

/**
 * Proxy IEM ridge TMS tiles to avoid browser CORS/cache quirks.
 * Query: radar, product, time (YYYYMMDDHHMI), z, x, y
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const radar = sp.get("radar") ?? "USCOMP";
  const product = sp.get("product") ?? "N0Q";
  const time = sp.get("time");
  const z = Number(sp.get("z"));
  const x = Number(sp.get("x"));
  const y = Number(sp.get("y"));

  if (!time || ![z, x, y].every(Number.isFinite)) {
    return NextResponse.json(
      { error: "time, z, x, y required" },
      { status: 400 }
    );
  }

  const upstream = iemRadarTileUrl(radar, product, time, z, x, y);
  try {
    const res = await fetch(upstream, {
      headers: { Accept: "image/png" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return new NextResponse(`upstream ${res.status}`, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tile proxy error" },
      { status: 500 }
    );
  }
}
