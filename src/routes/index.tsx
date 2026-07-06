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
import { RaceCard } from "@/components/RaceCard";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/lap-trace-f1-logo.png.asset.json";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: s.season == null || s.season === "" ? undefined : String(s.season),
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  head: () => ({
    meta: [
      { title: "Lap Trace F1 — News, Calendar & Telemetry" },
      {
        name: "description",
        content:
          "Latest Formula 1 news and the full race calendar. Dive into any Grand Prix for race and qualifying results, lap-time analysis and in-car telemetry.",
      },
      { property: "og:title", content: "Lap Trace F1 — News, Calendar & Telemetry" },
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
  const { t } = useI18n();
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
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-primary to-brand-red"
        />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[260px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
              {t("home.eyebrow", { season })}
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              {t("home.title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t("home.subtitle")}
            </p>
            <div className="mt-5">
              <SeasonSelect
                season={season}
                onChange={(s) => navigate({ to: "/", search: { season: s } })}
              />
            </div>
          </div>
          <img
            src={logo.url}
            alt="Lap Trace F1"
            className="hidden h-28 w-auto self-center sm:block lg:h-36"
          />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Feature
            accent="red"
            icon="news"
            title={t("home.feat_news.t")}
            desc={t("home.feat_news.d")}
          />
          <Feature
            accent="blue"
            icon="calendar"
            title={t("home.feat_calendar.t")}
            desc={t("home.feat_calendar.d")}
          />
          <Feature
            accent="red"
            icon="telemetry"
            title={t("home.feat_telemetry.t")}
            desc={t("home.feat_telemetry.d")}
          />
        </div>
      </section>

      {/* Season snapshot — key championship numbers, on their own */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          accent="blue"
          label={t("stat.leader")}
          value={leader ? `${leader.Driver.code}` : "—"}
          sub={leader ? `${leader.points} ${t("unit.pts")}` : ""}
        />
        <Stat
          accent="red"
          label={t("stat.top_constructor")}
          value={constructors[0]?.Constructor.name ?? "—"}
          sub={constructors[0] ? `${constructors[0].points} ${t("unit.pts")}` : ""}
        />
        <Stat
          accent="blue"
          label={t("stat.rounds")}
          value={String(races.length)}
          sub={t("stat.this_season")}
        />
        <Stat
          accent="red"
          label={nextRace ? t("stat.next_race") : t("stat.final_round")}
          value={(nextRace ?? latestRace)?.Circuit.Location.country ?? "—"}
          sub={(nextRace ?? latestRace)?.raceName ?? ""}
        />
      </section>

      {/* Latest news — headline section, front and centre */}
      <Section
        title={t("section.latest_news")}
        action={
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("news.via")}
          </span>
        }
      >
        {newsQ.isLoading ? (
          <Spinner label={t("news.loading")} />
        ) : (
          <NewsFeed items={newsQ.data ?? []} />
        )}
      </Section>

      {/* Calendar (main) + standings (sidebar) */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <Section
          title={t("section.race_calendar")}
          action={
            <Link
              to="/races"
              search={{ season }}
              className="font-mono text-[11px] uppercase tracking-widest text-brand-blue hover:underline"
            >
              {t("section.full_calendar")}
            </Link>
          }
        >
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
            {races.map((r) => {
              const done = timeOf(r) <= now;
              return (
                <RaceCard key={r.round} race={r} season={season} done={done} />
              );
            })}
          </div>
        </Section>

        <Section
          title={t("section.standings")}
          action={
            <Link
              to="/standings"
              search={{ season }}
              className="font-mono text-[11px] uppercase tracking-widest text-brand-blue hover:underline"
            >
              {t("section.full_table")}
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
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "blue" | "red";
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background/40 p-3">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${
          accent === "blue" ? "bg-brand-blue" : "bg-brand-red"
        }`}
      />
      <p className="pl-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate pl-1.5 text-lg font-semibold">{value}</p>
      {sub && <p className="truncate pl-1.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  news: (
    <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 0h2a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  telemetry: <path d="M4 15l4-6 3 4 3-7 3 5 3-2M4 19h16" />,
};

function Feature({
  icon,
  title,
  desc,
  accent,
}: {
  icon: keyof typeof FEATURE_ICONS;
  title: string;
  desc: string;
  accent: "blue" | "red";
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background/40 p-4">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 ${
          accent === "blue" ? "bg-brand-blue" : "bg-brand-red"
        }`}
      />
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          accent === "blue"
            ? "bg-brand-blue/10 text-brand-blue"
            : "bg-brand-red/10 text-brand-red"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {FEATURE_ICONS[icon]}
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
