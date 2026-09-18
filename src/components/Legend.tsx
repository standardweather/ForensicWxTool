export default function Legend() {
  const items = [
    { color: "#ff2020", label: "Tornado Warning (TO.W)" },
    { color: "#ffcc00", label: "Severe T-storm Warning (SV.W)" },
    { color: "#ff3333", label: "SPC Tornado report" },
    { color: "#33cc66", label: "SPC Hail report" },
    { color: "#4488ff", label: "SPC Wind report" },
    { color: "#f59e0b", label: "NWS Local Storm Report" },
    { color: "#a78bfa", label: "Nearby METAR" },
    { color: "#38bdf8", label: "Selected location" },
  ];

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
        Radar: IEM ridge N0Q (Base Reflectivity). Tiles proxied via /api/radar/tile.
      </p>
    </div>
  );
}
