import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  seasonsQuery,
  driverStandingsQuery,
  constructorStandingsQuery,
  racesQuery,
} from "@/lib/jolpica";
import { latestNewsQuery } from "@/lib/news.functions";
import { Section, ErrorBox, Spinner } from "@/components/ui-bits";
import { NewsFeed } from "@/components/NewsFeed";
import { SeasonSelect } from "@/components/SeasonSelect";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  head: () => ({
    meta: [
      { title: "LapTrace F1 — News, Calendar & Telemetry" },
      {
        name: "description",
        content:
          "Latest Formula 1 news and the full race calendar. Dive into any Grand Prix for race and qualifying results, lap-time analysis and in-car telemetry.",
      },
      { property: "og:title", content: "LapTrace F1 — News, Calendar & Telemetry" },
      {
        property: "og:description",
        content:
          "Latest F1 news, the race calendar, and interactive race & qualifying telemetry.",
      },
    ],
  }),
  loader: async ({ context, deps }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = deps.season ?? seasons[0];
    await Promise.all([
      context.queryClient.ensureQueryData(driverStandingsQuery(season)),
      context.queryClient.ensureQueryData(constructorStandingsQuery(season)),
      context.queryClient.ensureQueryData(racesQuery(season)),
    ]);
    context.queryClient.prefetchQuery(latestNewsQuery());
    return { season };
  },
  pendingComponent: () => <Spinner />,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ErrorBox message={error.message} />
    </div>
  ),
  component: Home,
});

function Home() {
  const { season } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: drivers } = useSuspenseQuery(driverStandingsQuery(season));
  const { data: constructors } = useSuspenseQuery(constructorStandingsQuery(season));
  const { data: races } = useSuspenseQuery(racesQuery(season));
  const newsQ = useQuery(latestNewsQuery());

  const now = Date.now();
  const timeOf = (r: (typeof races)[number]) =>
    new Date(`${r.date}T${r.time ?? "00:00:00Z"}`).getTime();
  const past = races.filter((r) => timeOf(r) <= now);
  const latestRace = past[past.length - 1] ?? races[races.length - 1];
  const nextRace = races.find((r) => timeOf(r) > now);
  const leader = drivers[0];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
              {season} Formula 1 World Championship
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              F1 news, the calendar, and every lap — visualized.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Catch the latest headlines, then pick a Grand Prix to explore race and
              qualifying results, lap-time analysis and in-car telemetry.
            </p>
          </div>
          <SeasonSelect
            season={season}
            onChange={(s) => navigate({ to: "/", search: { season: s } })}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Championship Leader" value={leader ? `${leader.Driver.code}` : "—"} sub={leader ? `${leader.points} pts` : ""} />
          <Stat label="Top Constructor" value={constructors[0]?.Constructor.name ?? "—"} sub={constructors[0] ? `${constructors[0].points} pts` : ""} />
          <Stat label="Rounds" value={String(races.length)} sub="this season" />
          <Stat
            label={nextRace ? "Next Race" : "Final Round"}
            value={(nextRace ?? latestRace)?.Circuit.Location.country ?? "—"}
            sub={(nextRace ?? latestRace)?.raceName ?? ""}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <Section
            title="Race Calendar"
            action={
              <Link
                to="/races"
                search={{ season }}
                className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
              >
                Full calendar →
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {races.map((r) => {
                const done = timeOf(r) <= now;
                return (
                  <Link
                    key={r.round}
                    to="/races/$round"
                    params={{ round: r.round }}
                    search={{ season }}
                    className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Round {r.round}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-widest ${
                          done ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {done ? "Finished" : "Upcoming"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold leading-tight">{r.raceName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {r.Circuit.Location.locality}, {r.Circuit.Location.country}
                      </p>
                    </div>
                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Section>
        </div>

        <div className="order-1 space-y-8 lg:order-2">
          <Section
            title="Latest F1 News"
            action={
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                via Autosport
              </span>
            }
          >
            {newsQ.isLoading ? (
              <Spinner label="Loading news…" />
            ) : (
              <NewsFeed items={newsQ.data ?? []} />
            )}
          </Section>

          <Section
            title="Standings"
            action={
              <Link
                to="/standings"
                search={{ season }}
                className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
              >
                Full table →
              </Link>
            }
          >
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {drivers.slice(0, 5).map((d) => (
                <div key={d.Driver.driverId} className="flex items-center gap-3 p-3">
                  <span className="w-5 font-mono text-xs text-muted-foreground">
                    {d.position}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {d.Driver.givenName} {d.Driver.familyName}
                  </span>
                  <span className="font-mono text-sm font-semibold">{d.points}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
      {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
