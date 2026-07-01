import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDriver {
  code: string;
  color: string;
}

const AXIS = "oklch(0.66 0.02 260)";
const GRID = "oklch(0.30 0.012 260)";

function Channel({
  title,
  unit,
  suffix,
  rows,
  drivers,
  height,
  domain,
  step,
  ticks,
  onHover,
  onLeave,
}: {
  title: string;
  unit: string;
  suffix: string;
  rows: Record<string, number | null>[];
  drivers: ChartDriver[];
  height: number;
  domain?: [number, number];
  step?: boolean;
  ticks?: number[];
  onHover?: (distance: number) => void;
  onLeave?: () => void;
}) {
  return (
    <div>
      <p className="mb-1 px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title} <span className="text-muted-foreground/60">{unit}</span>
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={["dataMin", "dataMax"]}
            stroke={AXIS}
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}`}
          />
          <YAxis
            domain={domain ?? ["auto", "auto"]}
            ticks={ticks}
            stroke={AXIS}
            width={34}
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.20 0.012 260)",
              border: `1px solid ${GRID}`,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: AXIS }}
            formatter={(value, name) => [`${value}${suffix}`, String(name)]}
            labelFormatter={(d) => `${(Number(d) / 1000).toFixed(2)} km`}
          />
          {drivers.map((d) => (
            <Line
              key={d.code}
              type={step ? "stepAfter" : "monotone"}
              dataKey={`${d.code}_${key(title)}`}
              name={d.code}
              stroke={d.color}
              strokeWidth={1.75}
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

function key(title: string): string {
  const t = title.toLowerCase();
  if (t.startsWith("speed")) return "speed";
  if (t.startsWith("throttle")) return "throttle";
  if (t.startsWith("brake")) return "brake";
  if (t.startsWith("gear")) return "gear";
  return "drs";
}

export function TelemetryChart({
  rows,
  drivers,
}: {
  rows: Record<string, number | null>[];
  drivers: ChartDriver[];
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <Channel title="Speed" unit="km/h" suffix=" km/h" rows={rows} drivers={drivers} height={200} />
      <Channel title="Throttle" unit="%" suffix="%" rows={rows} drivers={drivers} height={120} domain={[0, 100]} ticks={[0, 50, 100]} />
      <Channel title="Brake" unit="on/off" suffix="%" rows={rows} drivers={drivers} height={90} domain={[0, 100]} ticks={[0, 100]} step />
      <Channel title="Gear" unit="n" suffix="" rows={rows} drivers={drivers} height={120} domain={[0, 8]} ticks={[1, 3, 5, 7]} step />
      <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        Distance (km) →
      </p>
    </div>
  );
}
