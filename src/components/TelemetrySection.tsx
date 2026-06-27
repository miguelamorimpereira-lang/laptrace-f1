import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import type { RaceResult } from "@/lib/jolpica";
import { constructorColor } from "@/lib/jolpica";
import {
  OPENF1_MIN_SEASON,
  raceSessionQuery,
  sessionDriversQuery,
  lapTelemetryQuery,
  mergeTelemetry,
  formatLapTime,
  type TelemetryDriverSeries,
} from "@/lib/openf1";
import { DriverChips, type ChipDriver } from "@/components/DriverChips";
import { TelemetryChart } from "@/components/TelemetryChart";
import { Spinner } from "@/components/ui-bits";

const MAX = 3;

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function TelemetrySection({
  season,
  results,
  raceDate,
}: {
  season: string;
  results: RaceResult[];
  raceDate: string;
}) {
  const year = Number(season);

  if (year < OPENF1_MIN_SEASON) {
    return (
      <Note>
        In-car telemetry (speed, throttle, brake, gear) is only available from{" "}
        {OPENF1_MIN_SEASON} onward. Pick a {OPENF1_MIN_SEASON}+ race to compare
        fastest-lap traces.
      </Note>
    );
  }

  return <TelemetryBody results={results} year={year} raceDate={raceDate} />;
}

function TelemetryBody({
  results,
  year,
  raceDate,
}: {
  results: RaceResult[];
  year: number;
  raceDate: string;
}) {
  const sessionQ = useQuery(raceSessionQuery(year, raceDate));
  const session = sessionQ.data ?? null;
  const driversQ = useQuery(sessionDriversQuery(session?.session_key));

  // Map Jolpica finishers to OpenF1 driver numbers (by 3-letter code, then surname).
  const drivers: ChipDriver[] = useMemo(() => {
    const of1 = driversQ.data ?? [];
    const byCode = new Map(of1.map((d) => [d.name_acronym?.toUpperCase(), d]));
    const bySurname = new Map(of1.map((d) => [d.last_name?.toLowerCase(), d]));
    const out: ChipDriver[] = [];
    for (const r of results) {
      const code = r.Driver.code?.toUpperCase();
      const match =
        (code && byCode.get(code)) ||
        bySurname.get(r.Driver.familyName.toLowerCase());
      if (!match) continue;
      out.push({
        id: String(match.driver_number),
        code: code ?? match.name_acronym,
        color: constructorColor(r.Constructor.constructorId),
        name: `${r.Driver.givenName} ${r.Driver.familyName}`,
      });
    }
    return out;
  }, [driversQ.data, results]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Initialise to the top 2 finishers once the driver list is known.
  const effective =
    selected.size === 0 && drivers.length
      ? new Set(drivers.slice(0, 2).map((d) => d.id))
      : selected;

  const toggle = (id: string) =>
    setSelected((_prev) => {
      const next = new Set(effective);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const activeIds = [...effective];
  const telemetryQs = useQueries({
    queries: activeIds.map((id) =>
      lapTelemetryQuery(session?.session_key, Number(id)),
    ),
  });

  // Error from session/drivers lookup (e.g. live-session lock).
  const fatal = sessionQ.error ?? driversQ.error;
  if (fatal) {
    return <Note>{(fatal as Error).message}</Note>;
  }

  if (sessionQ.isLoading || (session && driversQ.isLoading)) {
    return <Spinner label="Loading telemetry…" />;
  }

  if (!session) {
    return <Note>No OpenF1 session could be matched to this race.</Note>;
  }

  const colorByCode = new Map(drivers.map((d) => [d.id, d] as const));
  const series: TelemetryDriverSeries[] = [];
  let anyLoading = false;
  let telemetryError: string | null = null;
  activeIds.forEach((id, i) => {
    const q = telemetryQs[i];
    if (q.isLoading) anyLoading = true;
    if (q.error) telemetryError = (q.error as Error).message;
    const meta = colorByCode.get(id);
    if (q.data?.samples?.length && meta) {
      series.push({ code: meta.code, color: meta.color, samples: q.data.samples });
    }
  });

  const merged = mergeTelemetry(series);

  const lapLabels = activeIds
    .map((id, i) => {
      const meta = colorByCode.get(id);
      const lap = telemetryQs[i].data?.lap;
      if (!meta || !lap?.lap_duration) return null;
      return { code: meta.code, color: meta.color, time: lap.lap_duration };
    })
    .filter((x): x is { code: string; color: string; time: number } => x != null);

  return (
    <div className="space-y-3">
      <DriverChips drivers={drivers} selected={effective} onToggle={toggle} max={MAX} />
      <p className="font-mono text-[11px] text-muted-foreground">
        Comparing each driver's fastest lap · pick up to {MAX} drivers.
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
        <TelemetryChart rows={merged.rows} drivers={series.map((s) => ({ code: s.code, color: s.color }))} />
      ) : (
        !anyLoading &&
        !telemetryError && (
          <Note>
            {activeIds.length === 0
              ? "Select drivers above to load their fastest-lap telemetry."
              : "Telemetry is not available for the selected drivers in this race."}
          </Note>
        )
      )}
    </div>
  );
}

