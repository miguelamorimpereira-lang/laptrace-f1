import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  seasonsQuery,
  driverStandingsQuery,
  constructorStandingsQuery,
} from "@/lib/jolpica";
import { Section, ErrorBox, Spinner } from "@/components/ui-bits";
import { SeasonSelect } from "@/components/SeasonSelect";
import {
  DriverStandingsTable,
  ConstructorStandingsList,
} from "@/components/standings-tables";

export const Route = createFileRoute("/standings")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  loader: async ({ context, deps }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = deps.season ?? seasons[0];
    await Promise.all([
      context.queryClient.ensureQueryData(driverStandingsQuery(season)),
      context.queryClient.ensureQueryData(constructorStandingsQuery(season)),
    ]);
    return { season };
  },
  head: () => ({
    meta: [
      { title: "F1 Championship Standings — Apex Data" },
      {
        name: "description",
        content:
          "Full Formula 1 driver and constructor championship standings for any season.",
      },
    ],
  }),
  pendingComponent: () => <Spinner />,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ErrorBox message={error.message} />
    </div>
  ),
  component: Standings,
});

function Standings() {
  const { season } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: drivers } = useSuspenseQuery(driverStandingsQuery(season));
  const { data: constructors } = useSuspenseQuery(constructorStandingsQuery(season));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Championship Standings</h1>
        <SeasonSelect
          season={season}
          onChange={(s) => navigate({ to: "/standings", search: { season: s } })}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title={`Drivers · ${season}`}>
            <DriverStandingsTable standings={drivers} />
          </Section>
        </div>
        <div>
          <Section title={`Constructors · ${season}`}>
            <ConstructorStandingsList standings={constructors} />
          </Section>
        </div>
      </div>
    </main>
  );
}
