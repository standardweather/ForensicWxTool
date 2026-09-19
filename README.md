# ForensicWxTool

Map-first forensic meteorology MVP: given a lat/lon and past date/time, review archived radar, MRMS mosaics, (realtime) GOES, NWS storm-based warnings, SPC severe weather reports, NWS local storm reports (LSRs), and nearby METARs.

Built with **TypeScript**, **Next.js (App Router)**, and **MapLibre GL**. Public archive fetches run through **server API routes** (no fragile browser-only CORS).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional production build:

```bash
npm run build && npm start
```

## Demo events

### Moore 2013 (NEXRAD velocity / reflectivity)

| Field | Value |
| --- | --- |
| Event | Moore / Newcastle, OK EF5 tornado |
| Lat | `35.34` |
| Lon | `-97.49` |
| Time (UTC) | `2013-05-20T19:56:00Z` |

Click **Demo 2013**. Expect:

- IEM ridge frames for **TLX** (and national **USCOMP**): **N0Q**, **N0U**, **N0S**, **NET**
- Dual-pol (**N0X** / **N0C** / **N0K**) often empty for this era — UI shows a clear empty-scans note
- **MRMS** / historical **GOES**: empty with explanatory notes (MRMS ≈ 2015+; GOES TMS is realtime-only)
- Tornado / SVR warning polygons, SPC tornado reports, OK ASOS METARs

### N Texas 2019 (MRMS)

| Field | Value |
| --- | --- |
| Event | North Texas severe (MRMS coverage demo) |
| Lat | `32.78` |
| Lon | `-96.80` |
| Time (UTC) | `2019-05-20T19:00:00Z` |

Click **Demo MRMS**. Expect SeamlessHSR (**lcref**), precip rate (**a2m**), and 1h precip (**p1h**) synthetic scan lists + tiles. Switch source back to NEXRAD for site products (e.g. FWS).

## Environment variables

Copy `.env.example` → `.env.local` if needed:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MPING_API_KEY` | No | Enables live mPING queries. Without it, `/api/mping` returns a clear stub/TODO. Historical access typically needs a Research or Commercial license from OU. |

No other secrets are required. Do not commit `.env*` files.

## Data sources (what is live)

| Layer | Status | Source |
| --- | --- | --- |
| NEXRAD ridge tiles + scan list | **Live** | IEM `/json/radar.py` + TMS `ridge::SITE-PRODUCT-YYYYMMDDHHMI` via **`/c/tile.py`**, proxied by `/api/radar/*` |
| MRMS mosaic tiles | **Live** (≥ ~2015) | IEM TMS `mrms::{lcref\|a2m\|p1h}-YYYYMMDDHHMI` via **`/cache/tile.py`** (not `/c/`). Scan list is synthesized (even minutes; hourly for p1h) |
| GOES East CONUS | **Realtime only** | IEM `goes_east_conus_ch{02,09,13}` via `/cache/tile.py`. No working historical timestamp layer found |
| Lightning | **Stub** | `/api/lightning` returns `{ flashes: [], stub: true }` — no free historical GeoJSON verified |
| NWS storm-based warnings | **Live** | IEM `/geojson/sbw.geojson` via `/api/warnings` |
| SPC storm reports | **Live** | SPC filtered daily CSV via `/api/reports/spc` |
| NWS Local Storm Reports | **Live** | IEM `/geojson/lsr.geojson` via `/api/reports/lsr` |
| Nearby METARs | **Live** | IEM ASOS download via `/api/metar` |
| mPING crowd reports | **Stub** (optional live with key) | `/api/mping` — requires `MPING_API_KEY` |

### Imagery sources (one primary raster at a time)

Sidebar **Imagery source** switches between:

1. **NEXRAD site (ridge)** — site dropdown + products N0Q / N0Z / N0U / N0S / NET / N0X / N0C / N0K  
2. **MRMS** — lcref / a2m / p1h  
3. **Satellite (GOES East)** — ch13 IR / ch02 Visible / ch09 WV  

Tile proxy: `/api/radar/tile?source=ridge|mrms|goes&...`

#### NEXRAD RIDGE

```text
https://mesonet.agron.iastate.edu/c/tile.py/1.0.0/ridge::{RADAR}-{PRODUCT}-{YYYYMMDDHHMI}/{z}/{x}/{y}.png
```

Scan list: IEM `/json/radar.py?operation=list&radar=&product=&start=&end=`  
Default product **N0Q**, with automatic **N0Z** fallback when N0Q scans are empty.

#### MRMS archived TMS

```text
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/mrms::{product}-{YYYYMMDDHHMI}/{z}/{x}/{y}.png
```

| Product | Cadence | Notes |
| --- | --- | --- |
| `lcref` | even minutes | SeamlessHSR reflectivity |
| `a2m` | even minutes | precip rate |
| `p1h` | top of hour | URI uses `p1h` (not zero-padded); also `p24h` / `p48h` / `p72h` in IEM docs |

Archive starts ~**early 2015**. Pre-2015 events show: “MRMS archive starts ~2015”.

#### GOES satellite

Realtime pattern (works):

```text
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png
```

Timestamped layer-name guesses (`sat::…-YYYYMMDDHHMI`, `goes16::ch13-…`) return identical placeholder PNGs — **not usable as archive**. For event times outside a ~6h realtime window the UI shows: “Historical GOES TMS not available for this time; realtime/latest only”.

#### Lightning

No free historical lightning tile/GeoJSON API was verified (IEM lightning paths redirect to `/api/` without a usable flash feed). The **Lightning** layer toggle calls `/api/lightning`, which returns an empty stub and a TODO for **AWS GLM flashes** (or licensed NLDN). Points are never invented.

## UI features

- Dark, map-first layout with sidebar controls
- Lat/lon inputs + **map click** to set location
- Datetime picker (browser local → UTC ISO for APIs)
- Imagery source + product selector (NEXRAD XOR MRMS XOR GOES)
- Layer toggles + legend + scrollable report list
- Radar / imagery **time scrubber** with play/pause
- Demo buttons for 2013 Moore and 2019 MRMS

## Project layout

```text
src/app/api/          Server proxies (radar, lightning, warnings, SPC, LSR, METAR, mPING)
src/components/       Legend, MapView, ReportList, Sidebar, TimeScrubber
src/lib/              IEM/SPC helpers, geo utils, types
```

## Limitations & follow-ups

- IEM and SPC are public best-effort services; expect occasional 5xx / rate limits.
- Radar is Level-III imagery archive, not full Level-II moment data.
- Dual-pol ridge products are sparse historically (e.g. Moore 2013 N0X/N0C/N0K often 503 / empty).
- MRMS mosaics begin ~2015; GOES TMS is realtime-only on IEM.
- Lightning is stubbed pending AWS GLM (or licensed NLDN) integration.
- Warning query uses a time window around the event; UI filters to TO/SV/FF/FA/MA.
- SPC CSV times are HHMM UTC on the SPC “storm day” (12Z–12Z).
- METAR station discovery uses a fixed set of nearby state ASOS networks — expand for other regions as needed.
- mPING is stubbed without an API key; license terms restrict redistribution.
- Mobile sidebar is minimized; full controls are on `md+` viewports.
- Be a good citizen: cache where reasonable and avoid hammering IEM/SPC in tight loops.

## License / attribution

Use NOAA/NWS/SPC/IEM attribution when publishing screenshots or derived products. This MVP is for educational / research review workflows.
