import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { seasonsQuery, racesQuery } from "@/lib/jolpica";
import { ErrorBox, Spinner } from "@/components/ui-bits";
import { SeasonSelect } from "@/components/SeasonSelect";
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
  const { t, locale } = useI18n();
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {races.map((r) => {
          const done =
            new Date(`${r.date}T${r.time ?? "00:00:00Z"}`).getTime() <= now;
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
                {new Date(r.date).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
