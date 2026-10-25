import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { seasonSearch } from "@/lib/search";
import { useSuspenseQuery } from "@tanstack/react-query";
import { seasonsQuery, racesQuery } from "@/lib/jolpica";
import { ErrorBox, Spinner } from "@/components/ui-bits";
import { SeasonSelect } from "@/components/SeasonSelect";
import { RaceCard } from "@/components/RaceCard";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/races/")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  loader: async ({ context, deps }) => {
    const seasons = await context.queryClient.ensureQueryData(seasonsQuery());
    const season = deps.season ?? seasons[0];
    await context.queryClient.ensureQueryData(racesQuery(season));
    return { season };
  },
  head: () => ({
    meta: [
      { title: "F1 Race Calendar & Results — Lap Trace F1" },
      {
        name: "description",
        content: "Browse the Formula 1 race calendar and jump into results for any round.",
      },
    ],
  }),
  pendingComponent: () => <Spinner />,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ErrorBox message={error.message} />
    </div>
  ),
  component: Races,
});

function Races() {
  const { season } = Route.useLoaderData();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: races } = useSuspenseQuery(racesQuery(season));
  const now = Date.now();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("races.title")}</h1>
        <SeasonSelect
          season={season}
          onChange={(s) => navigate({ to: "/races", search: { season: s } })}
        />
      </div>

      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {races.map((r) => {
          const done =
            new Date(`${r.date}T${r.time ?? "00:00:00Z"}`).getTime() <= now;
          return (
            <RaceCard key={r.round} race={r} season={season} done={done} />
          );
        })}
      </div>
    </main>
  );
}
