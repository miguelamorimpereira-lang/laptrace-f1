import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  sessionDriversQuery,
  lapTelemetryQuery,
  segmentTelemetryQuery,
  mergeTelemetry,
  formatLapTime,
  type OF1Session,
  type TelemetryDriverSeries,
} from "@/lib/openf1";
import { DriverChips, type ChipDriver } from "@/components/DriverChips";
import { TelemetryChart } from "@/components/TelemetryChart";
import { Spinner } from "@/components/ui-bits";

const MAX = 3;

/** One selectable driver, mapped from Jolpica results to be matched to OpenF1. */
export interface TelemetryEntry {
  driverId: string;
  code?: string;
  familyName: string;
  givenName: string;
  color: string;
  /** Target lap time in seconds (Q1/Q2/Q3). Omit to use the session's fastest lap. */
  targetSeconds?: number;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function TelemetrySection({
  session,
  sessionError,
  sessionLoading,
  entries,
  emptyNote,
  onHoverDistance,
  onMaxDistance,
}: {
  session: OF1Session | null | undefined;
  sessionError?: Error | null;
  sessionLoading?: boolean;
  entries: TelemetryEntry[];
  emptyNote?: string;
  onHoverDistance?: (distance: number | null) => void;
  onMaxDistance?: (max: number) => void;
}) {
  const driversQ = useQuery(sessionDriversQuery(session?.session_key));

  // Map Jolpica entries to OpenF1 driver numbers (by 3-letter code, then surname).
  const drivers: (ChipDriver & { targetSeconds?: number })[] = useMemo(() => {
    const of1 = driversQ.data ?? [];
    const byCode = new Map(of1.map((d) => [d.name_acronym?.toUpperCase(), d]));
    const bySurname = new Map(of1.map((d) => [d.last_name?.toLowerCase(), d]));
    const out: (ChipDriver & { targetSeconds?: number })[] = [];
    for (const e of entries) {
      const code = e.code?.toUpperCase();
      const match =
        (code && byCode.get(code)) || bySurname.get(e.familyName.toLowerCase());
      if (!match) continue;
      out.push({
        id: String(match.driver_number),
        code: code ?? match.name_acronym,
        color: e.color,
        name: `${e.givenName} ${e.familyName}`,
        targetSeconds: e.targetSeconds,
      });
    }
    return out;
  }, [driversQ.data, entries]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Reset selection when the driver list identity changes across sessions.
  const [signature, setSignature] = useState<string>("");
  const currentSig = drivers.map((d) => d.id).join(",");
  if (currentSig !== signature) {
    setSignature(currentSig);
    setSelected(new Set());
  }

  const effective =
    selected.size === 0 && drivers.length
      ? new Set(drivers.slice(0, 2).map((d) => d.id))
      : selected;

  const toggle = (id: string) =>
    setSelected(() => {
      const next = new Set(effective);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const activeIds = [...effective];
  const byId = new Map(drivers.map((d) => [d.id, d] as const));

  const telemetryQs = useQueries({
    queries: activeIds.map((id) => {
      const meta = byId.get(id);
      return meta?.targetSeconds != null
        ? segmentTelemetryQuery(session?.session_key, Number(id), meta.targetSeconds)
        : lapTelemetryQuery(session?.session_key, Number(id));
    }),
  });

  const fatal = sessionError ?? driversQ.error;
  if (fatal) return <Note>{(fatal as Error).message}</Note>;

  if (sessionLoading || (session && driversQ.isLoading)) {
    return <Spinner label="Loading telemetry…" />;
  }

  if (!session) {
    return <Note>{emptyNote ?? "No telemetry session could be matched to this weekend."}</Note>;
  }

  const series: TelemetryDriverSeries[] = [];
  let anyLoading = false;
  let telemetryError: string | null = null;
  activeIds.forEach((id, i) => {
    const q = telemetryQs[i];
    if (q.isLoading) anyLoading = true;
    if (q.error) telemetryError = (q.error as Error).message;
    const meta = byId.get(id);
    if (q.data?.samples?.length && meta) {
      series.push({ code: meta.code, color: meta.color, samples: q.data.samples });
    }
  });

  const merged = mergeTelemetry(series);

  const lapLabels = activeIds
    .map((id, i) => {
      const meta = byId.get(id);
      const lap = telemetryQs[i].data?.lap;
      if (!meta || !lap?.lap_duration) return null;
      return { code: meta.code, color: meta.color, time: lap.lap_duration };
    })
    .filter((x): x is { code: string; color: string; time: number } => x != null);

  return (
    <div className="space-y-3">
      <DriverChips
        drivers={drivers}
        selected={effective}
        onToggle={toggle}
        max={MAX}
      />
      <p className="font-mono text-[11px] text-muted-foreground">
        Comparing each driver's best lap · pick up to {MAX} drivers.
      </p>

      {lapLabels.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {lapLabels.map((l) => (
            <span
              key={l.code}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.code}
              <span className="text-muted-foreground">{formatLapTime(l.time)}</span>
            </span>
          ))}
        </div>
      )}

      {telemetryError && <Note>{telemetryError}</Note>}
      {anyLoading && <Spinner label="Loading telemetry…" />}

      {!anyLoading && series.length > 0 ? (
        <TelemetryChart
          rows={merged.rows}
          drivers={series.map((s) => ({ code: s.code, color: s.color }))}
          onHover={(d) => {
            onMaxDistance?.(merged.maxDistance);
            onHoverDistance?.(d);
          }}
          onLeave={() => onHoverDistance?.(null)}
        />
      ) : (
        !anyLoading &&
        !telemetryError && (
          <Note>
            {activeIds.length === 0
              ? "Select drivers above to load their telemetry."
              : "Telemetry is not available for the selected drivers in this session."}
          </Note>
        )
      )}
    </div>
  );
}
