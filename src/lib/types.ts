export type RadarSite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
};

export type RadarScan = {
  ts: string; // ISO-ish e.g. 2013-05-20T19:55Z
  layerId: string; // YYYYMMDDHHMI for IEM ridge layer
};

export type LayerVisibility = {
  radar: boolean;
  warnings: boolean;
  spcReports: boolean;
  lsr: boolean;
  metar: boolean;
  mping: boolean;
};

export type SpcReport = {
  id: string;
  type: "tornado" | "hail" | "wind";
  timeUtc: string;
  lat: number;
  lon: number;
  location: string;
  county: string;
  state: string;
  magnitude: string | null;
  comments: string;
  distanceKm?: number;
};

export type LsrFeatureProps = {
  typetext: string;
  type: string;
  city: string;
  county: string;
  state: string;
  valid: string;
  magnitude: string;
  remark: string;
  source: string;
  lat: number;
  lon: number;
};

export type MetarObs = {
  station: string;
  valid: string;
  lat: number;
  lon: number;
  tmpf: number | null;
  dwpf: number | null;
  sknt: number | null;
  gust: number | null;
  drct: number | null;
  vsby: number | null;
  wxcodes: string | null;
  metar: string | null;
  distanceKm: number;
};

export type DemoEvent = {
  name: string;
  lat: number;
  lon: number;
  datetimeUtc: string;
  notes: string;
};

export const DEMO_EVENT: DemoEvent = {
  name: "Moore, OK EF5 Tornado (May 20, 2013)",
  lat: 35.34,
  lon: -97.49,
  datetimeUtc: "2013-05-20T19:56:00Z",
  notes:
    "Classic forensic case: TLX N0Q reflectivity, Tornado Warnings (OUN), and SPC tornado reports through Moore/Newcastle.",
};
