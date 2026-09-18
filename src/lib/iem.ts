export const IEM_BASE = "https://mesonet.agron.iastate.edu";

export function iemRadarAvailableUrl(
  lat: number,
  lon: number,
  startIso: string
): string {
  const u = new URL(`${IEM_BASE}/json/radar.py`);
  u.searchParams.set("operation", "available");
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("start", startIso);
  return u.toString();
}

export function iemRadarScansUrl(
  radar: string,
  product: string,
  startIso: string,
  endIso: string
): string {
  const u = new URL(`${IEM_BASE}/json/radar.py`);
  u.searchParams.set("operation", "list");
  u.searchParams.set("radar", radar);
  u.searchParams.set("product", product);
  u.searchParams.set("start", startIso);
  u.searchParams.set("end", endIso);
  return u.toString();
}

export function iemRadarTileUrl(
  radar: string,
  product: string,
  layerTime: string,
  z: number,
  x: number,
  y: number
): string {
  // Long-cache historical TMS endpoint
  return `${IEM_BASE}/c/tile.py/1.0.0/ridge::${radar}-${product}-${layerTime}/${z}/${x}/${y}.png`;
}

export function iemSbwUrl(
  tsIso: string,
  opts?: { sts?: string; ets?: string }
): string {
  const u = new URL(`${IEM_BASE}/geojson/sbw.geojson`);
  if (opts?.sts && opts?.ets) {
    u.searchParams.set("sts", opts.sts);
    u.searchParams.set("ets", opts.ets);
  } else {
    u.searchParams.set("ts", tsIso);
  }
  return u.toString();
}

export function iemLsrUrl(bbox: {
  west: number;
  east: number;
  south: number;
  north: number;
  sts: string;
  ets: string;
}): string {
  const u = new URL(`${IEM_BASE}/geojson/lsr.geojson`);
  u.searchParams.set("sts", bbox.sts);
  u.searchParams.set("ets", bbox.ets);
  u.searchParams.set("west", String(bbox.west));
  u.searchParams.set("east", String(bbox.east));
  u.searchParams.set("south", String(bbox.south));
  u.searchParams.set("north", String(bbox.north));
  return u.toString();
}

export function iemAsosUrl(params: {
  station: string;
  sts: string;
  ets: string;
}): string {
  const start = new Date(params.sts);
  const end = new Date(params.ets);
  const u = new URL(`${IEM_BASE}/cgi-bin/request/asos.py`);
  u.searchParams.set("station", params.station);
  u.searchParams.set("data", "tmpf,dwpf,sknt,gust,drct,vsby,wxcodes,metar");
  u.searchParams.set("tz", "Etc/UTC");
  u.searchParams.set("format", "onlycomma");
  u.searchParams.set("latlon", "yes");
  u.searchParams.set("year1", String(start.getUTCFullYear()));
  u.searchParams.set("month1", String(start.getUTCMonth() + 1));
  u.searchParams.set("day1", String(start.getUTCDate()));
  u.searchParams.set("hour1", String(start.getUTCHours()));
  u.searchParams.set("minute1", String(start.getUTCMinutes()));
  u.searchParams.set("year2", String(end.getUTCFullYear()));
  u.searchParams.set("month2", String(end.getUTCMonth() + 1));
  u.searchParams.set("day2", String(end.getUTCDate()));
  u.searchParams.set("hour2", String(end.getUTCHours()));
  u.searchParams.set("minute2", String(end.getUTCMinutes()));
  return u.toString();
}

/** Rough CONUS state ASOS network pick from lon/lat. */
function candidateAsosNetworks(lat: number, lon: number): string[] {
  const rules: {
    net: string;
    south: number;
    north: number;
    west: number;
    east: number;
  }[] = [
    { net: "OK_ASOS", south: 33.5, north: 37.2, west: -103.2, east: -94.3 },
    { net: "TX_ASOS", south: 25.8, north: 36.6, west: -106.7, east: -93.4 },
    { net: "KS_ASOS", south: 36.9, north: 40.1, west: -102.2, east: -94.5 },
    { net: "AR_ASOS", south: 33.0, north: 36.6, west: -94.7, east: -89.6 },
    { net: "MO_ASOS", south: 36.0, north: 40.7, west: -95.9, east: -89.0 },
    { net: "IA_ASOS", south: 40.3, north: 43.6, west: -96.7, east: -90.1 },
    { net: "NE_ASOS", south: 40.0, north: 43.1, west: -104.1, east: -95.3 },
    { net: "AL_ASOS", south: 30.1, north: 35.1, west: -88.6, east: -84.8 },
    { net: "MS_ASOS", south: 30.1, north: 35.1, west: -91.8, east: -88.0 },
    { net: "LA_ASOS", south: 28.9, north: 33.2, west: -94.2, east: -88.7 },
    { net: "CO_ASOS", south: 36.9, north: 41.1, west: -109.2, east: -102.0 },
    { net: "IL_ASOS", south: 36.9, north: 42.6, west: -91.6, east: -87.0 },
    { net: "IN_ASOS", south: 37.7, north: 41.8, west: -88.2, east: -84.7 },
    { net: "OH_ASOS", south: 38.3, north: 42.0, west: -84.9, east: -80.5 },
    { net: "GA_ASOS", south: 30.3, north: 35.1, west: -85.7, east: -80.7 },
    { net: "FL_ASOS", south: 24.4, north: 31.1, west: -87.7, east: -79.9 },
    { net: "NC_ASOS", south: 33.7, north: 36.7, west: -84.4, east: -75.4 },
    { net: "SC_ASOS", south: 32.0, north: 35.3, west: -83.5, east: -78.4 },
    { net: "TN_ASOS", south: 34.9, north: 36.7, west: -90.4, east: -81.6 },
    { net: "KY_ASOS", south: 36.4, north: 39.2, west: -89.6, east: -81.9 },
  ];
  const hits = rules
    .filter(
      (r) =>
        lat >= r.south - 0.5 &&
        lat <= r.north + 0.5 &&
        lon >= r.west - 0.5 &&
        lon <= r.east + 0.5
    )
    .map((r) => r.net);
  if (hits.length) return [...new Set(hits)].slice(0, 4);
  return ["OK_ASOS", "TX_ASOS", "KS_ASOS", "MO_ASOS"];
}

export async function fetchNearbyAsosStations(
  lat: number,
  lon: number
): Promise<{ id: string; name: string; lat: number; lon: number }[]> {
  const networks = candidateAsosNetworks(lat, lon);
  const stations: { id: string; name: string; lat: number; lon: number }[] = [];

  await Promise.all(
    networks.map(async (net) => {
      try {
        const res = await fetch(`${IEM_BASE}/geojson/network/${net}.geojson`, {
          next: { revalidate: 86400 },
        });
        if (!res.ok) return;
        const gj = (await res.json()) as {
          features: {
            properties: { sid: string; sname: string };
            geometry: { coordinates: [number, number] };
          }[];
        };
        for (const f of gj.features ?? []) {
          const [slon, slat] = f.geometry.coordinates;
          stations.push({
            id: f.properties.sid,
            name: f.properties.sname,
            lat: slat,
            lon: slon,
          });
        }
      } catch {
        // ignore network failures
      }
    })
  );

  if (!stations.length) return [];

  const { distanceKm } = await import("./geo");
  return stations
    .map((s) => ({ ...s, d: distanceKm(lat, lon, s.lat, s.lon) }))
    .filter((s) => s.d <= 150)
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map(({ id, name, lat: la, lon: lo }) => ({
      id,
      name,
      lat: la,
      lon: lo,
    }));
}
