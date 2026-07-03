import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { seasonsQuery } from "@/lib/jolpica";
import { useT } from "@/lib/i18n";

export function SeasonSelect({
  season,
  onChange,
}: {
  season: string;
  onChange: (season: string) => void;
}) {
  const { data: seasons } = useSuspenseQuery(seasonsQuery());
  const t = useT();
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {t("common.season")}
      </span>
      <select
        value={season}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

export function useSeasonNav(route: "/standings" | "/races") {
  const navigate = useNavigate();
  return (season: string) =>
    navigate({ to: route, search: { season } });
}
