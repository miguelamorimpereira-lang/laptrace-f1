import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  seasonsQuery,
  driverStandingsQuery,
  constructorStandingsQuery,
  racesQuery,
} from "@/lib/jolpica";
import { Section, ErrorBox, Spinner } from "@/components/ui-bits";
import {
  DriverStandingsTable,
  ConstructorStandingsList,
} from "@/components/standings-tables";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apex Data — Formula 1 Statistics & Visualization" },
      {
        name: "description",
        content:
          "Explore Formula 1 driver and constructor standings, race results, and lap-time analysis across every season with interactive charts and tables.",
      },
      { property: "og:title", content: "Apex Data — Formula 1 Statistics & Visualization" },
      {
        property: "og:description",
        content:
          "Interactive F1 standings, race results, and lap-time charts for every season.",
      },
    ],
  }),
  loader: async ({ context }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = seasons[0];
    await Promise.all([
      context.queryClient.ensureQueryData(driverStandingsQuery(season)),
      context.queryClient.ensureQueryData(constructorStandingsQuery(season)),
      context.queryClient.ensureQueryData(racesQuery(season)),
    ]);
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
  const { data: drivers } = useSuspenseQuery(driverStandingsQuery(season));
  const { data: constructors } = useSuspenseQuery(constructorStandingsQuery(season));
  const { data: races } = useSuspenseQuery(racesQuery(season));

  const now = Date.now();
  const past = races.filter((r) => new Date(`${r.date}T${r.time ?? "00:00:00Z"}`).getTime() <= now);
  const latestRace = past[past.length - 1] ?? races[races.length - 1];
  const nextRace = races.find(
    (r) => new Date(`${r.date}T${r.time ?? "00:00:00Z"}`).getTime() > now,
  );
  const leader = drivers[0];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
          {season} Formula 1 World Championship
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Every driver, team and lap — visualized.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Browse championship standings, race-by-race results and lap-time telemetry across
          {" "}
          {races.length} rounds of the {season} season.
        </p>
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title="Driver Standings"
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
            <DriverStandingsTable standings={drivers} limit={8} />
          </Section>
        </div>
        <div>
          <Section
            title="Constructors"
            action={
              <Link
                to="/standings"
                search={{ season }}
                className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
              >
                All →
              </Link>
            }
          >
            <ConstructorStandingsList standings={constructors} limit={6} />
          </Section>
        </div>
      </div>

      {latestRace && (
        <Section
          title="Latest Race"
          action={
            <Link
              to="/races"
              search={{ season }}
              className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
            >
              All races →
            </Link>
          }
        >
          <Link
            to="/races/$round"
            params={{ round: latestRace.round }}
            search={{ season }}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Round {latestRace.round}
              </p>
              <p className="mt-1 text-lg font-semibold">{latestRace.raceName}</p>
              <p className="text-sm text-muted-foreground">
                {latestRace.Circuit.circuitName} · {latestRace.Circuit.Location.country}
              </p>
            </div>
            <span className="font-mono text-sm text-primary">View results →</span>
          </Link>
        </Section>
      )}
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
