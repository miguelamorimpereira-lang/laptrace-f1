import { useQuery } from "@tanstack/react-query";
import {
  circuitsQuery,
  matchCircuit,
  buildTrackPath,
  pointAtFraction,
} from "@/lib/circuits";
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
  positionFraction,
  hoverDistance,
  maxDistance,
}: {
  lat?: string;
  long?: string;
  circuitName: string;
  /** 0–1 position along the lap to highlight, or null to hide the marker. */
  positionFraction?: number | null;
  /** Current hover distance in metres, for the readout. */
  hoverDistance?: number | null;
  /** Lap length in metres, for the readout. */
  maxDistance?: number;
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
  const start = path.points.length > 0;
  const startPoint = path.points[0];

  const marker =
    positionFraction != null ? pointAtFraction(path, positionFraction) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <svg
        viewBox={`0 0 ${path.width} ${path.height}`}
        className="mx-auto block h-auto w-full max-w-xs"
        role="img"
        aria-label={`${circuitName} track layout`}
      >
        {/* Outline shadow for depth */}
        <path
          d={path.d}
          fill="none"
          stroke="var(--border)"
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Track ribbon */}
        <path
          d={path.d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {start && startPoint && (
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={14}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={6}
          />
        )}
        {marker && (
          <>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={26}
              fill="var(--primary)"
              opacity={0.25}
            >
              <animate
                attributeName="r"
                values="20;30;20"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={13}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={5}
            />
          </>
        )}
      </svg>
      <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {feature.properties.Name}
        {feature.properties.length
          ? ` · ${(feature.properties.length / 1000).toFixed(3)} km`
          : ""}
      </p>
      {marker && hoverDistance != null && maxDistance ? (
        <p className="mt-1 text-center font-mono text-[11px] text-primary">
          {(hoverDistance / 1000).toFixed(2)} / {(maxDistance / 1000).toFixed(2)} km
        </p>
      ) : (
        <p className="mt-1 text-center font-mono text-[11px] text-muted-foreground/60">
          Hover the telemetry to locate it on track
        </p>
      )}
    </div>
  );
}
