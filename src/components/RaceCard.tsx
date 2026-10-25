import { Link } from "@tanstack/react-router";
import type { Race } from "@/lib/jolpica";
import { useI18n } from "@/lib/i18n";

export function RaceCard({
  race,
  season,
  done,
  className = "",
}: {
  race: Race;
  season: string;
  done: boolean;
  className?: string;
}) {
  const { t, locale } = useI18n();

  return (
    <Link
      to="/races/$round"
      params={{ round: race.round }}
      search={{ season }}
      className={`group relative flex min-h-[184px] flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-primary to-brand-red"
      />

      <div className="relative z-10 grid min-h-[152px] flex-1 grid-rows-[auto_1fr_auto] gap-4">
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {t("race.round", { n: race.round })}
          </span>
          <span
            className={`shrink-0 font-mono text-[10px] uppercase tracking-widest ${
              done ? "text-muted-foreground" : "text-brand-blue"
            }`}
          >
            {done ? t("race.finished") : t("race.upcoming")}
          </span>
        </div>

        <div className="self-start">
          <p className="line-clamp-2 text-base font-semibold leading-tight">
            {race.raceName}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </p>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          {new Date(race.date).toLocaleDateString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </Link>
  );
}
