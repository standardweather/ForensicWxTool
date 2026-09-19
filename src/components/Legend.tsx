import type { ImagerySource } from "@/lib/types";

type Props = {
  imagerySource?: ImagerySource;
  product?: string;
};

export default function Legend({
  imagerySource = "ridge",
  product = "N0Q",
}: Props) {
  const items = [
    { color: "#ff2020", label: "Tornado Warning (TO.W)" },
    { color: "#ffcc00", label: "Severe T-storm Warning (SV.W)" },
    { color: "#ff3333", label: "SPC Tornado report" },
    { color: "#33cc66", label: "SPC Hail report" },
    { color: "#4488ff", label: "SPC Wind report" },
    { color: "#f59e0b", label: "NWS Local Storm Report" },
    { color: "#a78bfa", label: "METAR wind barb" },
    { color: "#fbbf24", label: "Lightning (stub — no points)" },
    { color: "#38bdf8", label: "Selected location" },
  ];

  let imageryNote =
    "Radar: IEM ridge N0Q (Base Reflectivity). Tiles proxied via /api/radar/tile.";
  if (imagerySource === "ridge") {
    if (product === "N0U" || product === "N0S") {
      imageryNote =
        "Velocity: warm/cool colors = outbound/inbound (IEM ridge palette). N0U base velocity; N0S storm-relative.";
    } else if (product === "NET") {
      imageryNote = "Echo tops (NET): storm top height from IEM ridge archive.";
    } else if (product === "N0X" || product === "N0C" || product === "N0K") {
      imageryNote =
        "Dual-pol product — archive coverage is sparse before ~mid-2010s; empty scans are expected for many older events.";
    } else {
      imageryNote = `NEXRAD ridge ${product} via IEM /c/tile.py (proxied). N0Q falls back to N0Z when empty.`;
    }
  } else if (imagerySource === "mrms") {
    imageryNote = `MRMS ${product} via IEM /cache/tile.py (mrms::${product}-YYYYMMDDHHMI). Archive ≈ 2015+.`;
  } else if (imagerySource === "goes") {
    imageryNote = `GOES East CONUS ${product}: realtime/latest TMS only (no historical timestamp layers on IEM).`;
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Legend
      </h3>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: it.color }}
            />
            {it.label}
          </li>
        ))}
      </ul>
      <p className="pt-1 text-[10px] leading-snug text-slate-500">
        Wind barbs: staff points into the wind (from). Pennant=50 kt, full
        barb=10, half=5. Label{" "}
        <span className="font-mono text-violet-300/90">12G25</span> = speed +
        gust (kt). Calm (&lt;2.5 kt) shown as a circle. Barbs track the radar
        scrubber time.
      </p>
      <p className="text-[10px] leading-snug text-slate-500">{imageryNote}</p>
    </div>
  );
}
