import type { NewsItem } from "@/lib/news.functions";
import { useI18n } from "@/lib/i18n";

function useTimeAgo() {
  const { t } = useI18n();
  return (pubDate: string | null): string => {
    if (!pubDate) return "";
    const time = new Date(pubDate).getTime();
    if (!Number.isFinite(time)) return "";
    const diff = Date.now() - time;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return t("time.just_now");
    if (mins < 60) return t("time.m_ago", { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t("time.h_ago", { n: hours });
    const days = Math.round(hours / 24);
    return t("time.d_ago", { n: days });
  };
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("news.unavailable")}</p>
      </div>
    );
  }

  const [featured, ...rest] = items;
  const cards = rest.slice(0, 4);

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[1.25fr_1fr]">
      {/* Featured top story */}
      <a
        href={featured.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block min-h-[360px] overflow-hidden rounded-xl border border-border bg-card lg:min-h-[430px]"
      >
        {featured.image ? (
          <div className="relative h-full min-h-[360px] w-full overflow-hidden lg:min-h-[430px]">
            <img
              src={featured.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span className="inline-block rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                {t("news.top_story")}
              </span>
              <h3 className="mt-2 line-clamp-3 text-xl font-bold leading-snug text-white sm:text-2xl">
                {featured.title}
              </h3>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-white/70">
                {featured.source}
                {timeAgo(featured.pubDate) && ` · ${timeAgo(featured.pubDate)}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <span className="inline-block rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              {t("news.top_story")}
            </span>
            <h3 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
              {featured.title}
            </h3>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {featured.source}
              {timeAgo(featured.pubDate) && ` · ${timeAgo(featured.pubDate)}`}
            </p>
          </div>
        )}
      </a>

      {/* Secondary stories as a grid of cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid min-h-[208px] grid-rows-[auto_1fr] overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
          >
            {n.image && (
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                <img
                  src={n.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="flex min-h-[86px] flex-col justify-between p-3">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">
                {n.title}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {n.source}
                {timeAgo(n.pubDate) && ` · ${timeAgo(n.pubDate)}`}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
