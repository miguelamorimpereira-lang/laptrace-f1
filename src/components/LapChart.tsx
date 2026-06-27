import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Lap, RaceResult } from "@/lib/jolpica";
import { lapTimeToSeconds, constructorColor } from "@/lib/jolpica";
import { DriverChips, type ChipDriver } from "@/components/DriverChips";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(3);
  return m > 0 ? `${m}:${rest.padStart(6, "0")}` : `${rest}s`;
}

export function LapChart({
  laps,
  results,
}: {
  laps: Lap[];
  results: RaceResult[];
}) {
  // Every classified driver is selectable; default to the top 3 finishers.
  const drivers: ChipDriver[] = useMemo(
    () =>
      results.map((r) => ({
        id: r.Driver.driverId,
        code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
        color: constructorColor(r.Constructor.constructorId),
        name: `${r.Driver.givenName} ${r.Driver.familyName}`,
      })),
    [results],
  );

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(drivers.slice(0, 3).map((d) => d.id)),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const active = drivers.filter((d) => selected.has(d.id));
  const codeById = new Map(drivers.map((d) => [d.id, d.code] as const));

  // Build a row per lap with one column per *selected* driver.
  const data = useMemo(() => {
    return laps.map((lap) => {
      const row: Record<string, number | string> = { lap: Number(lap.number) };
      for (const t of lap.Timings) {
        if (!selected.has(t.driverId)) continue;
        const sec = lapTimeToSeconds(t.time);
        const code = codeById.get(t.driverId);
        if (sec != null && code) row[code] = Number(sec.toFixed(3));
      }
      return row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laps, selected]);

  // Trim y-axis to ignore pit / safety-car outliers.
  const { min, p95 } = useMemo(() => {
    const all = data
      .flatMap((r) => active.map((d) => r[d.code]))
      .filter((v): v is number => typeof v === "number");
    if (all.length === 0) return { min: 0, p95: 0 };
    const sorted = [...all].sort((a, b) => a - b);
    return {
      min: sorted[0],
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selected]);

  const hasData = active.length > 0 && p95 > 0;

  return (
    <div className="space-y-3">
      <DriverChips drivers={drivers} selected={selected} onToggle={toggle} />
      <div className="rounded-xl border border-border bg-card p-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
              <CartesianGrid stroke="oklch(0.30 0.012 260)" strokeDasharray="3 3" />
              <XAxis
                dataKey="lap"
                stroke="oklch(0.66 0.02 260)"
                tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                label={{ value: "LAP", position: "insideBottomRight", offset: -2, fontSize: 10, fill: "oklch(0.66 0.02 260)" }}
              />
              <YAxis
                domain={[Math.floor(min - 1), Math.ceil(p95 + 1)]}
                stroke="oklch(0.66 0.02 260)"
                tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                tickFormatter={(v: number) => formatSeconds(v)}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.20 0.012 260)",
                  border: "1px solid oklch(0.30 0.012 260)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono",
                }}
                labelStyle={{ color: "oklch(0.66 0.02 260)" }}
                formatter={(value, name) => [formatSeconds(Number(value)), String(name)]}
                labelFormatter={(l) => `Lap ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              {active.map((d) => (
                <Line
                  key={d.code}
                  type="monotone"
                  dataKey={d.code}
                  stroke={d.color}
                  strokeWidth={1.75}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {active.length === 0
              ? "Select one or more drivers above to plot their lap times."
              : "Lap-time data is not available for this race."}
          </p>
        )}
      </div>
    </div>
  );
}
