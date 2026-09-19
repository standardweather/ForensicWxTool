export type RadarSite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
};

export type RadarScan = {
  ts: string; // ISO-ish e.g. 2013-05-20T19:55Z
  layerId: string; // YYYYMMDDHHMI for IEM ridge/MRMS layer; "latest" for realtime GOES
};

/** Primary imagery raster source — only one heavy layer at a time. */
export type ImagerySource = "ridge" | "mrms" | "goes";

export type LayerVisibility = {
  /** Primary imagery (NEXRAD / MRMS / GOES — selected via source mode). */
  radar: boolean;
  lightning: boolean;
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
  /** Parsed from raw METAR string when present. */
  reportType?: "METAR" | "SPECI" | "unknown";
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
    "Classic forensic case: TLX N0Q/N0U/N0S/NET, Tornado Warnings (OUN), SPC tornado reports. MRMS/GOES historical unavailable for 2013.",
};

/** Post-2015 severe day with MRMS archive coverage (Dallas–Fort Worth area). */
export const DEMO_EVENT_MRMS: DemoEvent = {
  name: "N TX severe (May 20, 2019) — MRMS demo",
  lat: 32.78,
  lon: -96.8,
  datetimeUtc: "2019-05-20T19:00:00Z",
  notes:
    "Use imagery source MRMS (lcref/a2m/p1h). Also try nearby NEXRAD (e.g. FWS) for N0Q/N0U.",
};

export type ProductOption = {
  value: string;
  label: string;
  /** Optional short note shown in UI */
  hint?: string;
};

export const RIDGE_PRODUCTS: ProductOption[] = [
  { value: "N0Q", label: "N0Q Base Reflectivity (hi-res)", hint: "Older events; recent sites often use N0B" },
  { value: "N0B", label: "N0B Base Reflectivity (digital)", hint: "Common on recent NEXRAD archives" },
  { value: "N0Z", label: "N0Z Base Reflectivity" },
  { value: "N0U", label: "N0U Base Velocity", hint: "Older events; try N0S if empty" },
  { value: "N0S", label: "N0S Storm-Relative Velocity" },
  { value: "NET", label: "NET Echo Tops" },
  {
    value: "N0X",
    label: "N0X Differential Reflectivity",
    hint: "Dual-pol; sparse historically",
  },
  {
    value: "N0C",
    label: "N0C Correlation Coefficient",
    hint: "Dual-pol; sparse historically",
  },
  {
    value: "N0K",
    label: "N0K Specific Differential Phase",
    hint: "Dual-pol; sparse historically",
  },
];

export const MRMS_PRODUCTS: ProductOption[] = [
  { value: "lcref", label: "SeamlessHSR Reflectivity (lcref)" },
  { value: "a2m", label: "Precip Rate (a2m)" },
  { value: "p1h", label: "1-hour Precipitation (p1h)" },
];

export const GOES_PRODUCTS: ProductOption[] = [
  { value: "ch13", label: "IR Clean Window (ch13)" },
  { value: "ch02", label: "Visible Red (ch02)" },
  { value: "ch09", label: "Water Vapor (ch09)" },
];

/** Default product when switching imagery source. */
export const DEFAULT_PRODUCT: Record<ImagerySource, string> = {
  ridge: "N0Q",
  mrms: "lcref",
  goes: "ch13",
};

/** MRMS TMS archive roughly begins early 2015. */
export const MRMS_ARCHIVE_START_UTC = Date.UTC(2015, 0, 1);

/** Treat event times within this many ms of "now" as realtime for GOES. */
export const GOES_REALTIME_WINDOW_MS = 6 * 60 * 60 * 1000;
