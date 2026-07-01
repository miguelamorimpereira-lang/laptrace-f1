import { useQuery } from "@tanstack/react-query";
import { circuitsQuery, matchCircuit, buildTrackPath } from "@/lib/circuits";
import { Spinner } from "@/components/ui-bits";

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function TrackMap({
  lat,
  long,
  circuitName,
}: {
  lat?: string;
  long?: string;
  circuitName: string;
}) {
  const { data, isLoading, error } = useQuery(circuitsQuery());

  if (isLoading) return <Spinner label="Loading track layout…" />;
  if (error) return <Note>{(error as Error).message}</Note>;

  const feature = matchCircuit(
    data ?? [],
    lat != null ? Number(lat) : undefined,
    long != null ? Number(long) : undefined,
  );

  if (!feature) {
    return <Note>No track layout is available for this circuit.</Note>;
  }

  const path = buildTrackPath(feature);
  const start = feature.geometry.coordinates.length > 0;

  // Start/finish marker = first coordinate, projected the same way.
  const { d } = path;
  const firstMatch = d.match(/^M([\d.]+),([\d.]+)/);
  const startX = firstMatch ? Number(firstMatch[1]) : 0;
  const startY = firstMatch ? Number(firstMatch[2]) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <svg
        viewBox={`0 0 ${path.width} ${path.height}`}
        className="mx-auto block h-auto w-full max-w-xs"
        role="img"
        aria-label={`${circuitName} track layout`}
      >
        {/* Outline shadow for depth */}
        <path
          d={d}
          fill="none"
          stroke="var(--border)"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Track ribbon */}
        <path
          d={d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {start && (
          <circle
            cx={startX}
            cy={startY}
            r={14}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={6}
          />
        )}
      </svg>
      <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {feature.properties.Name}
        {feature.properties.length
          ? ` · ${(feature.properties.length / 1000).toFixed(3)} km`
          : ""}
      </p>
    </div>
  );
}
