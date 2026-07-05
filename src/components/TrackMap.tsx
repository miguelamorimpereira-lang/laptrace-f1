import { useQuery } from "@tanstack/react-query";
import {
  circuitsQuery,
  matchCircuit,
  buildTrackPath,
  pointAtFraction,
  pointAtDistance,
  estimateTelemetryOffsetFraction,
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
  brakeDistances,
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
  /** Brake-zone distances from telemetry, used to calibrate the timing-line offset. */
  brakeDistances?: number[];
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
  const telemetryOffset = estimateTelemetryOffsetFraction(path, brakeDistances ?? []);
  const startPoint = pointAtFraction(path, telemetryOffset);

  const marker =
    hoverDistance != null
      ? pointAtDistance(path, hoverDistance + telemetryOffset * path.totalLen * 1000)
      : positionFraction != null
        ? pointAtFraction(path, positionFraction + telemetryOffset)
        : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <svg
        viewBox={`0 0 ${path.width} ${path.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-[300px] w-full max-w-xs"
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
        {startPoint && (
          <g>
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={16}
              fill="var(--background)"
              stroke="var(--primary)"
              strokeWidth={6}
            />
            <circle cx={startPoint.x} cy={startPoint.y} r={5} fill="var(--primary)" />
          </g>
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
          {telemetryOffset ? " · calibrated" : ""}
        </p>
      ) : (
        <p className="mt-1 text-center font-mono text-[11px] text-muted-foreground/60">
          Hover the telemetry to locate it on track
        </p>
      )}
    </div>
  );
}
