import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { seasonsQuery, raceResultsQuery, lapsQuery, constructorColor } from "@/lib/jolpica";
import { Section, ErrorBox, Spinner } from "@/components/ui-bits";
import { LapChart } from "@/components/LapChart";
import { BestLapChart } from "@/components/BestLapChart";
import { TelemetrySection } from "@/components/TelemetrySection";
import { TrackMap } from "@/components/TrackMap";

export const Route = createFileRoute("/races/$round")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  loader: async ({ context, deps, params }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = deps.season ?? seasons[0];
    await context.queryClient.ensureQueryData(raceResultsQuery(season, params.round));
    context.queryClient.ensureQueryData(lapsQuery(season, params.round));
    return { season };
  },
  head: () => ({
    meta: [
      { title: "Race Results & Lap Analysis — Apex Data" },
      { name: "description", content: "Detailed F1 race results and lap-time telemetry." },
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
  component: RaceDetail,
});

function RaceDetail() {
  const { season } = Route.useLoaderData();
  const { round } = Route.useParams();
  const { data: race } = useSuspenseQuery(raceResultsQuery(season, round));
  const { data: laps } = useSuspenseQuery(lapsQuery(season, round));

  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState(0);
  const positionFraction =
    hoverDistance != null && maxDistance > 0
      ? Math.min(1, Math.max(0, hoverDistance / maxDistance))
      : null;

  if (!race || !race.Results) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ErrorBox message="No results available for this round yet." />
      </main>
    );
  }

  const results = race.Results;
  const fastest = results.find((r) => r.FastestLap?.rank === "1");

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
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
        {fastest && (
          <p className="mt-2 inline-block rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[11px] text-foreground">
            Fastest Lap · {fastest.Driver.code} · {fastest.FastestLap?.Time.time}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-8">
          <Section title="Lap Times — All Laps">
            <LapChart laps={laps} results={results} />
          </Section>

          <Section title="Fastest Lap per Driver — Gap to Best">
            <BestLapChart laps={laps} results={results} />
          </Section>

          <Section title="Fastest-Lap Telemetry — Speed · Throttle · Brake · Gear">
            <TelemetrySection
              season={season}
              results={results}
              raceDate={race.date}
              onHoverDistance={setHoverDistance}
              onMaxDistance={setMaxDistance}
            />
          </Section>

          <Section title="Race Classification">
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
                      <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                        {r.grid}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.Time?.time ?? r.status}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
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
