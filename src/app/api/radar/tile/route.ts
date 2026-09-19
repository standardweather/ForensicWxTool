import { NextRequest, NextResponse } from "next/server";
import {
  iemGoesRealtimeTileUrl,
  iemMrmsTileUrl,
  iemRadarTileUrl,
} from "@/lib/iem";

export const dynamic = "force-dynamic";

/**
 * Proxy IEM TMS tiles (ridge / MRMS / GOES) to avoid browser CORS quirks.
 * Query: source=ridge|mrms|goes, radar, product, time (YYYYMMDDHHMI|latest), z, x, y
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const source = (sp.get("source") ?? "ridge").toLowerCase();
  const radar = sp.get("radar") ?? "USCOMP";
  const product = sp.get("product") ?? "N0Q";
  const time = sp.get("time");
  const z = Number(sp.get("z"));
  const x = Number(sp.get("x"));
  const y = Number(sp.get("y"));

  if (![z, x, y].every(Number.isFinite)) {
    return NextResponse.json({ error: "z, x, y required" }, { status: 400 });
  }

  let upstream: string;
  if (source === "mrms") {
    if (!time || time === "latest") {
      return NextResponse.json(
        { error: "time (YYYYMMDDHHMI) required for MRMS" },
        { status: 400 }
      );
    }
    upstream = iemMrmsTileUrl(product, time, z, x, y);
  } else if (source === "goes") {
    // Historical GOES TMS with timestamps is not exposed by IEM; realtime only.
    upstream = iemGoesRealtimeTileUrl(product, z, x, y);
  } else {
    if (!time || time === "latest") {
      return NextResponse.json(
        { error: "time required for ridge" },
        { status: 400 }
      );
    }
    upstream = iemRadarTileUrl(radar, product, time, z, x, y);
  }

  try {
    const res = await fetch(upstream, {
      headers: { Accept: "image/png" },
      next: { revalidate: source === "goes" ? 300 : 86400 },
    });
    if (!res.ok) {
      return new NextResponse(`upstream ${res.status}`, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          source === "goes"
            ? "public, max-age=300"
            : "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tile proxy error" },
      { status: 500 }
    );
  }
}
