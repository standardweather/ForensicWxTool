# ForensicWxTool

Map-first forensic meteorology MVP: given a lat/lon and past date/time, review archived radar, NWS storm-based warnings, SPC severe weather reports, NWS local storm reports (LSRs), and nearby METARs.

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

## Demo event (interesting data)

| Field | Value |
| --- | --- |
| Event | Moore / Newcastle, OK EF5 tornado |
| Lat | `35.34` |
| Lon | `-97.49` |
| Time (UTC) | `2013-05-20T19:56:00Z` |

Click **Demo** in the sidebar, or load those coordinates manually. Expect:

- IEM ridge radar frames for **TLX** (and national **USCOMP**) N0Q around 19:30–20:30Z
- Tornado / severe thunderstorm warning polygons (OUN and nearby WFOs)
- SPC tornado reports including Newcastle–Moore–S OKC
- Nearby OK ASOS METARs (e.g. OKC area)

## Environment variables

Copy `.env.example` → `.env.local` if needed:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MPING_API_KEY` | No | Enables live mPING queries. Without it, `/api/mping` returns a clear stub/TODO. Historical access typically needs a Research or Commercial license from OU. |

No other secrets are required. Do not commit `.env*` files.

## Data sources (what is live)

| Layer | Status | Source |
| --- | --- | --- |
| Archived radar tiles + scan list | **Live** | [Iowa State IEM](https://mesonet.agron.iastate.edu/) NEXRAD/MRMS ridge imagery via `/json/radar.py` and TMS `ridge::SITE-PRODUCT-YYYYMMDDHHMI` tiles (`/c/tile.py/...`), proxied by `/api/radar/*` |
| NWS storm-based warnings | **Live** | IEM `/geojson/sbw.geojson` (interval around event time), proxied by `/api/warnings` |
| SPC storm reports | **Live** | SPC filtered daily CSV `https://www.spc.noaa.gov/climo/reports/YYMMDD_rpts_filtered.csv` (e.g. `130520_rpts_filtered.csv`), parsed server-side by `/api/reports/spc` |
| NWS Local Storm Reports | **Live** | IEM `/geojson/lsr.geojson` bbox query via `/api/reports/lsr` |
| Nearby METARs | **Live** | IEM ASOS download (`/cgi-bin/request/asos.py`) for stations near the point via `/api/metar` |
| mPING crowd reports | **Stub** (optional live with key) | `/api/mping` — requires `MPING_API_KEY`; see [mPING API](https://mping.ou.edu/api/) |

### Radar choice (documented)

We use **IEM ridge Level-III PNG tiles** (not raw AWS NEXRAD Level-II) because they are:

1. Already colorized and TMS-ready for MapLibre
2. Indexed by scan time through a public JSON API
3. Available historically for both single-site NEXRAD and the **USCOMP** national mosaic

Tile URL pattern (proxied):

```text
https://mesonet.agron.iastate.edu/c/tile.py/1.0.0/ridge::{RADAR}-{PRODUCT}-{YYYYMMDDHHMI}/{z}/{x}/{y}.png
```

Default product: **N0Q** (base reflectivity), with automatic fallback to **N0Z** when N0Q scans are empty.

## UI features

- Dark, map-first layout with sidebar controls
- Lat/lon inputs + **map click** to set location
- Datetime picker (browser local → UTC ISO for APIs)
- Layer toggles + legend + scrollable report list
- Radar **time scrubber** with play/pause over archived frames

## Project layout

```text
src/app/api/          Server proxies (radar, warnings, SPC, LSR, METAR, mPING)
src/components/       Legend, MapView, ReportList, Sidebar, TimeScrubber
src/lib/              IEM/SPC helpers, geo utils, types
```

## Limitations & follow-ups

- IEM and SPC are public best-effort services; expect occasional 5xx / rate limits.
- Radar is Level-III imagery archive, not full Level-II moment data (no custom VR/SW products beyond what IEM ridge stores).
- Warning query uses a time window around the event; national floods/long-lived products can add noise — UI filters to TO/SV/FF/FA/MA warnings & watches.
- SPC CSV times are HHMM UTC on the SPC “storm day” (12Z–12Z); parsing maps pre-12Z times to the next calendar day.
- METAR station discovery loads a fixed set of nearby state ASOS networks (OK/TX/KS/AR/MO/IA/NE). Expand networks for other regions as needed.
- mPING is stubbed without an API key; license terms restrict redistribution.
- Mobile sidebar is minimized; full controls are on `md+` viewports.
- Be a good citizen: cache where reasonable and avoid hammering IEM/SPC in tight loops.

## License / attribution

Use NOAA/NWS/SPC/IEM attribution when publishing screenshots or derived products. This MVP is for educational / research review workflows.
