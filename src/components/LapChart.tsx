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
  // Pick the top 5 finishers as the comparison set.
  const drivers = results.slice(0, 5).map((r) => ({
    id: r.Driver.driverId,
    code: r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase(),
    color: constructorColor(r.Constructor.constructorId),
  }));
  const ids = new Set(drivers.map((d) => d.id));

  const data = laps.map((lap) => {
    const row: Record<string, number | string> = { lap: Number(lap.number) };
    for (const t of lap.Timings) {
      if (!ids.has(t.driverId)) continue;
      const sec = lapTimeToSeconds(t.time);
      if (sec != null) {
        const d = drivers.find((x) => x.id === t.driverId)!;
        row[d.code] = Number(sec.toFixed(3));
      }
    }
    return row;
  });

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Lap-time data is not available for this race.
      </div>
    );
  }

  // Trim y-axis to ignore extreme outliers (pit/safety-car laps).
  const allTimes = data
    .flatMap((r) => drivers.map((d) => r[d.code]))
    .filter((v): v is number => typeof v === "number");
  const sorted = [...allTimes].sort((a, b) => a - b);
  const min = sorted[0];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={360}>
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
          {drivers.map((d) => (
            <Line
              key={d.code}
              type="monotone"
              dataKey={d.code}
              stroke={d.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
