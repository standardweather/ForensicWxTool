/** Haversine distance in kilometers */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bboxAround(
  lat: number,
  lon: number,
  radiusKm: number
): { west: number; east: number; south: number; north: number } {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    west: lon - dLon,
    east: lon + dLon,
    south: lat - dLat,
    north: lat + dLat,
  };
}

/** Convert IEM scan ts like 2013-05-20T19:55Z to ridge layer timestamp YYYYMMDDHHMI */
export function scanTsToLayerId(ts: string): string {
  const m = ts.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  );
  if (!m) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts.replace(/\D/g, "").slice(0, 12);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
      `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
    );
  }
  return `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`;
}

/** SPC storm-day key YYMMDD for reports covering 12Z day through 12Z next day */
export function spcStormDayKey(isoUtc: string): string {
  const d = new Date(isoUtc);
  // If before 12Z, belongs to previous calendar day's SPC page
  const hour = d.getUTCHours();
  const adj = new Date(d);
  if (hour < 12) adj.setUTCDate(adj.getUTCDate() - 1);
  const yy = String(adj.getUTCFullYear()).slice(-2);
  const mm = String(adj.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(adj.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace(".000Z", "Z");
}


/** Initial bearing from point 1 to point 2, degrees clockwise from north (0–360). */
export function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function bearingCardinal(deg: number): string {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return CARDINALS[i]!;
}

/** Human-readable distance + bearing from a point of interest to a report. */
export function formatOffsetFromPoi(
  poiLat: number,
  poiLon: number,
  lat: number,
  lon: number
): string {
  const km = distanceKm(poiLat, poiLon, lat, lon);
  const mi = km * 0.621371;
  const brg = bearingDegrees(poiLat, poiLon, lat, lon);
  const card = bearingCardinal(brg);
  return `${km.toFixed(1)} km (${mi.toFixed(1)} mi) · ${card} (${Math.round(brg)}°)`;
}
