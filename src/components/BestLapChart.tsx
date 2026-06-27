import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Lap, RaceResult } from "@/lib/jolpica";
import { lapTimeToSeconds, constructorColor } from "@/lib/jolpica";

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(3);
  return m > 0 ? `${m}:${rest.padStart(6, "0")}` : `${rest}s`;
}

export function BestLapChart({
  laps,
  results,
}: {
  laps: Lap[];
  results: RaceResult[];
}) {
  const data = useMemo(() => {
    const meta = new Map(
      results.map((r) => [
        r.Driver.driverId,
        {
          code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
          color: constructorColor(r.Constructor.constructorId),
        },
      ]),
    );
    const best = new Map<string, number>();
    for (const lap of laps) {
      for (const t of lap.Timings) {
        const sec = lapTimeToSeconds(t.time);
        if (sec == null) continue;
        const cur = best.get(t.driverId);
        if (cur == null || sec < cur) best.set(t.driverId, sec);
      }
    }
    const rows = [...best.entries()]
      .map(([id, sec]) => ({
        id,
        code: meta.get(id)?.code ?? id.slice(0, 3).toUpperCase(),
        color: meta.get(id)?.color ?? "#9CA3AF",
        seconds: Number(sec.toFixed(3)),
      }))
      .sort((a, b) => a.seconds - b.seconds);
    const fastest = rows[0]?.seconds ?? 0;
    return rows.map((r) => ({ ...r, gap: Number((r.seconds - fastest).toFixed(3)) }));
  }, [laps, results]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Lap-time data is not available for this race.
      </div>
    );
  }

  const maxGap = Math.max(...data.map((d) => d.gap), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 26)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke="oklch(0.30 0.012 260)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxGap)]}
            stroke="oklch(0.66 0.02 260)"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v: number) => `+${v.toFixed(1)}s`}
          />
          <YAxis
            type="category"
            dataKey="code"
            width={48}
            stroke="oklch(0.66 0.02 260)"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
          />
          <Tooltip
            cursor={{ fill: "oklch(0.30 0.012 260 / 0.3)" }}
            contentStyle={{
              backgroundColor: "oklch(0.20 0.012 260)",
              border: "1px solid oklch(0.30 0.012 260)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "oklch(0.66 0.02 260)" }}
            formatter={(_v, _n, item) => {
              const row = item.payload as (typeof data)[number];
              return [`${formatSeconds(row.seconds)}  (+${row.gap.toFixed(3)}s)`, "Best lap"];
            }}
          />
          <Bar dataKey="gap" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
