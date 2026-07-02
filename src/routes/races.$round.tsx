import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  seasonsQuery,
  racesQuery,
  raceResultsQuery,
  qualifyingQuery,
  sprintQuery,
  lapsQuery,
  constructorColor,
  lapTimeToSeconds,
  type RaceResult,
  type QualifyingResult,
} from "@/lib/jolpica";
import {
  weekendSessionsQuery,
  OPENF1_MIN_SEASON,
  type SessionKind,
} from "@/lib/openf1";
import { Section, ErrorBox, Spinner } from "@/components/ui-bits";
import { LapChart } from "@/components/LapChart";
import { BestLapChart } from "@/components/BestLapChart";
import { TelemetrySection, type TelemetryEntry } from "@/components/TelemetrySection";
import { TrackMap } from "@/components/TrackMap";

const TABS: SessionKind[] = ["race", "qualifying", "sprint", "sprint-qualifying"];
const TAB_LABELS: Record<SessionKind, string> = {
  race: "Race",
  qualifying: "Qualifying",
  sprint: "Sprint",
  "sprint-qualifying": "Sprint Qualifying",
};

function isTab(v: unknown): v is SessionKind {
  return typeof v === "string" && (TABS as string[]).includes(v);
}

export const Route = createFileRoute("/races/$round")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
    tab: isTab(s.tab) ? s.tab : undefined,
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  loader: async ({ context, deps, params }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = deps.season ?? seasons[0];
    await context.queryClient.ensureQueryData(racesQuery(season));
    context.queryClient.ensureQueryData(raceResultsQuery(season, params.round));
    context.queryClient.ensureQueryData(lapsQuery(season, params.round));
    return { season };
  },
  head: () => ({
    meta: [
      { title: "Grand Prix — Race, Qualifying & Telemetry — LapTrace F1" },
      {
        name: "description",
        content:
          "Explore each Grand Prix: race and qualifying results, lap-time analysis, and in-car telemetry for every driver.",
      },
    ],
  }),
  pendingComponent: () => <Spinner />,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ErrorBox message={error.message} />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ErrorBox message="Race not found." />
    </div>
  ),
  component: GrandPrix,
});

function resultsToEntries(results: RaceResult[]): TelemetryEntry[] {
  return results.map((r) => ({
    driverId: r.Driver.driverId,
    code: r.Driver.code,
    familyName: r.Driver.familyName,
    givenName: r.Driver.givenName,
    color: constructorColor(r.Constructor.constructorId),
  }));
}

function GrandPrix() {
  const { season } = Route.useLoaderData();
  const { round } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const year = Number(season);

  const { data: races } = useSuspenseQuery(racesQuery(season));
  const race = races.find((r) => r.round === round) ?? null;

  const sprintQ = useQuery(sprintQuery(season, round));
  const weekendQ = useQuery(weekendSessionsQuery(year, race?.date ?? ""));

  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState(0);
  const positionFraction =
    hoverDistance != null && maxDistance > 0
      ? Math.min(1, Math.max(0, hoverDistance / maxDistance))
      : null;

  if (!race) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ErrorBox message="Race not found for this season." />
      </main>
    );
  }

  const hasSprint = !!sprintQ.data?.SprintResults?.length;
  const hasSprintQuali = weekendQ.data?.kinds.includes("sprint-qualifying") ?? false;

  const availableTabs = TABS.filter((t) => {
    if (t === "race" || t === "qualifying") return true;
    if (t === "sprint") return hasSprint;
    if (t === "sprint-qualifying") return hasSprintQuali;
    return false;
  });

  const tab: SessionKind =
    search.tab && availableTabs.includes(search.tab) ? search.tab : "race";

  const setTab = (t: SessionKind) =>
    navigate({
      to: "/races/$round",
      params: { round },
      search: { season, tab: t },
    });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <Link
          to="/races"
          search={{ season }}
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← {season} Calendar
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{race.raceName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Round {race.round} · {race.Circuit.circuitName}, {race.Circuit.Location.country} ·{" "}
          {new Date(race.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Session tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {availableTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-8">
          {tab === "race" && (
            <RaceTab
              season={season}
              round={round}
              year={year}
              raceDate={race.date}
              weekendSession={weekendQ.data?.byKind.race ?? null}
              weekendLoading={weekendQ.isLoading}
              weekendError={weekendQ.error as Error | null}
              onHover={setHoverDistance}
              onMax={setMaxDistance}
            />
          )}
          {tab === "qualifying" && (
            <QualifyingTab
              season={season}
              round={round}
              year={year}
              weekendSession={weekendQ.data?.byKind.qualifying ?? null}
              weekendLoading={weekendQ.isLoading}
              weekendError={weekendQ.error as Error | null}
              onHover={setHoverDistance}
              onMax={setMaxDistance}
            />
          )}
          {tab === "sprint" && (
            <SprintTab
              results={sprintQ.data?.SprintResults ?? []}
              year={year}
              weekendSession={weekendQ.data?.byKind.sprint ?? null}
              weekendLoading={weekendQ.isLoading}
              weekendError={weekendQ.error as Error | null}
              onHover={setHoverDistance}
              onMax={setMaxDistance}
            />
          )}
          {tab === "sprint-qualifying" && (
            <SprintQualifyingTab
              season={season}
              round={round}
              year={year}
              weekendSession={weekendQ.data?.byKind["sprint-qualifying"] ?? null}
              weekendLoading={weekendQ.isLoading}
              weekendError={weekendQ.error as Error | null}
              onHover={setHoverDistance}
              onMax={setMaxDistance}
            />
          )}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-8">
          <Section title="Circuit Layout">
            <TrackMap
              lat={race.Circuit.Location.lat}
              long={race.Circuit.Location.long}
              circuitName={race.Circuit.circuitName}
              positionFraction={positionFraction}
              hoverDistance={hoverDistance}
              maxDistance={maxDistance}
            />
          </Section>
        </aside>
      </div>
    </main>
  );
}

/* ---------------- Race tab ---------------- */

function TelemetryUnavailableNote({ year }: { year: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        In-car telemetry (speed, throttle, brake, gear) is only available from{" "}
        {OPENF1_MIN_SEASON} onward. This is a {year} session, so only lap times and
        results are shown.
      </p>
    </div>
  );
}

function RaceTab({
  season,
  round,
  year,
  raceDate,
  weekendSession,
  weekendLoading,
  weekendError,
  onHover,
  onMax,
}: {
  season: string;
  round: string;
  year: number;
  raceDate: string;
  weekendSession: import("@/lib/openf1").OF1Session | null;
  weekendLoading: boolean;
  weekendError: Error | null;
  onHover: (d: number | null) => void;
  onMax: (m: number) => void;
}) {
  const { data: race } = useSuspenseQuery(raceResultsQuery(season, round));
  const { data: laps } = useSuspenseQuery(lapsQuery(season, round));

  if (!race || !race.Results) {
    return <ErrorBox message="No results available for this round yet." />;
  }
  const results = race.Results;
  const fastest = results.find((r) => r.FastestLap?.rank === "1");

  return (
    <>
      {fastest && (
        <p className="inline-block rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-foreground">
          Fastest Lap · {fastest.Driver.code} · {fastest.FastestLap?.Time.time}
        </p>
      )}
      <Section title="Lap Times — All Laps">
        <LapChart laps={laps} results={results} />
      </Section>
      <Section title="Fastest Lap per Driver — Gap to Best">
        <BestLapChart laps={laps} results={results} />
      </Section>
      <Section title="Fastest-Lap Telemetry — Speed · Throttle · Brake · Gear">
        {year < OPENF1_MIN_SEASON ? (
          <TelemetryUnavailableNote year={year} />
        ) : (
          <TelemetrySection
            session={weekendSession}
            sessionLoading={weekendLoading}
            sessionError={weekendError}
            entries={resultsToEntries(results)}
            emptyNote="No OpenF1 race session could be matched to this weekend."
            onHoverDistance={onHover}
            onMaxDistance={onMax}
          />
        )}
      </Section>
      <Section title="Race Classification">
        <ResultsTable results={results} />
      </Section>
    </>
  );
}

/* ---------------- Qualifying tab ---------------- */

type Segment = "Q1" | "Q2" | "Q3";
const SEGMENTS: Segment[] = ["Q1", "Q2", "Q3"];

function QualifyingTab({
  season,
  round,
  year,
  weekendSession,
  weekendLoading,
  weekendError,
  onHover,
  onMax,
}: {
  season: string;
  round: string;
  year: number;
  weekendSession: import("@/lib/openf1").OF1Session | null;
  weekendLoading: boolean;
  weekendError: Error | null;
  onHover: (d: number | null) => void;
  onMax: (m: number) => void;
}) {
  const qualiQ = useQuery(qualifyingQuery(season, round));
  const [segment, setSegment] = useState<Segment>("Q3");

  if (qualiQ.isLoading) return <Spinner label="Loading qualifying…" />;
  const quali = qualiQ.data?.QualifyingResults ?? [];
  if (quali.length === 0) {
    return <ErrorBox message="No qualifying data available for this round." />;
  }

  const entries: TelemetryEntry[] = quali
    .map((q) => {
      const t = q[segment];
      const secs = t ? lapTimeToSeconds(t) : null;
      if (secs == null) return null;
      return {
        driverId: q.Driver.driverId,
        code: q.Driver.code,
        familyName: q.Driver.familyName,
        givenName: q.Driver.givenName,
        color: constructorColor(q.Constructor.constructorId),
        targetSeconds: secs,
      } as TelemetryEntry;
    })
    .filter((x): x is TelemetryEntry => x != null);

  return (
    <>
      <Section title="Qualifying Segment">
        <div className="flex gap-1.5">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={`rounded-md border px-4 py-1.5 font-mono text-sm transition-colors ${
                s === segment
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title={`${segment} Best-Lap Telemetry — Speed · Throttle · Brake · Gear`}>
        {year < OPENF1_MIN_SEASON ? (
          <TelemetryUnavailableNote year={year} />
        ) : entries.length === 0 ? (
          <ErrorBox message={`No drivers set a lap time in ${segment}.`} />
        ) : (
          <TelemetrySection
            key={segment}
            session={weekendSession}
            sessionLoading={weekendLoading}
            sessionError={weekendError}
            entries={entries}
            emptyNote="No OpenF1 qualifying session could be matched to this weekend."
            onHoverDistance={onHover}
            onMaxDistance={onMax}
          />
        )}
      </Section>

      <Section title="Qualifying Classification">
        <QualifyingTable results={quali} />
      </Section>
    </>
  );
}

/* ---------------- Sprint tab ---------------- */

function SprintTab({
  results,
  year,
  weekendSession,
  weekendLoading,
  weekendError,
  onHover,
  onMax,
}: {
  results: RaceResult[];
  year: number;
  weekendSession: import("@/lib/openf1").OF1Session | null;
  weekendLoading: boolean;
  weekendError: Error | null;
  onHover: (d: number | null) => void;
  onMax: (m: number) => void;
}) {
  return (
    <>
      <Section title="Sprint Fastest-Lap Telemetry — Speed · Throttle · Brake · Gear">
        {year < OPENF1_MIN_SEASON ? (
          <TelemetryUnavailableNote year={year} />
        ) : (
          <TelemetrySection
            session={weekendSession}
            sessionLoading={weekendLoading}
            sessionError={weekendError}
            entries={resultsToEntries(results)}
            emptyNote="No OpenF1 sprint session could be matched to this weekend."
            onHoverDistance={onHover}
            onMaxDistance={onMax}
          />
        )}
      </Section>
      <Section title="Sprint Classification">
        <ResultsTable results={results} />
      </Section>
    </>
  );
}

/* ---------------- Sprint qualifying tab ---------------- */

function SprintQualifyingTab({
  season,
  round,
  year,
  weekendSession,
  weekendLoading,
  weekendError,
  onHover,
  onMax,
}: {
  season: string;
  round: string;
  year: number;
  weekendSession: import("@/lib/openf1").OF1Session | null;
  weekendLoading: boolean;
  weekendError: Error | null;
  onHover: (d: number | null) => void;
  onMax: (m: number) => void;
}) {
  // Ergast/Jolpica has no SQ1/SQ2/SQ3 split, so we use each driver's overall
  // fastest lap in the OpenF1 Sprint Qualifying session. Driver list comes from
  // whatever result set is available for names/colours.
  const sprintQ = useQuery(sprintQuery(season, round));
  const qualiQ = useQuery(qualifyingQuery(season, round));

  const source: TelemetryEntry[] =
    sprintQ.data?.SprintResults?.length
      ? resultsToEntries(sprintQ.data.SprintResults)
      : (qualiQ.data?.QualifyingResults ?? []).map((q) => ({
          driverId: q.Driver.driverId,
          code: q.Driver.code,
          familyName: q.Driver.familyName,
          givenName: q.Driver.givenName,
          color: constructorColor(q.Constructor.constructorId),
        }));

  return (
    <Section title="Sprint Qualifying — Fastest-Lap Telemetry">
      <p className="mb-3 text-xs text-muted-foreground">
        Sprint Qualifying segment times (SQ1/SQ2/SQ3) aren't published on the free
        data feeds, so this shows each driver's overall fastest lap in the session.
      </p>
      {year < OPENF1_MIN_SEASON ? (
        <TelemetryUnavailableNote year={year} />
      ) : (
        <TelemetrySection
          session={weekendSession}
          sessionLoading={weekendLoading}
          sessionError={weekendError}
          entries={source}
          emptyNote="No OpenF1 sprint qualifying session could be matched to this weekend."
          onHoverDistance={onHover}
          onMaxDistance={onMax}
        />
      )}
    </Section>
  );
}

/* ---------------- Tables ---------------- */

function ResultsTable({ results }: { results: RaceResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Team</th>
            <th className="px-4 py-3 text-center font-medium">Grid</th>
            <th className="px-4 py-3 font-medium">Time / Status</th>
            <th className="px-4 py-3 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {results.map((r) => (
            <tr key={r.Driver.driverId} className="transition-colors hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-muted-foreground">
                {r.positionText.padStart(2, "0")}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-1 rounded-full"
                    style={{ backgroundColor: constructorColor(r.Constructor.constructorId) }}
                  />
                  <span className="font-medium">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {r.Constructor.name}
              </td>
              <td className="px-4 py-3 text-center font-mono text-muted-foreground">{r.grid}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.Time?.time ?? r.status}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualifyingTable({ results }: { results: QualifyingResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Team</th>
            <th className="px-4 py-3 text-right font-medium">Q1</th>
            <th className="px-4 py-3 text-right font-medium">Q2</th>
            <th className="px-4 py-3 text-right font-medium">Q3</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {results.map((r) => (
            <tr key={r.Driver.driverId} className="transition-colors hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-muted-foreground">
                {r.position.padStart(2, "0")}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-1 rounded-full"
                    style={{ backgroundColor: constructorColor(r.Constructor.constructorId) }}
                  />
                  <span className="font-medium">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {r.Constructor.name}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">{r.Q1 ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono text-xs">{r.Q2 ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono text-xs">{r.Q3 ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
