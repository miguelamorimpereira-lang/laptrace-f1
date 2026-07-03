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

  return (
    <div className="space-y-4">
      {/* Featured top story */}
      <a
        href={featured.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-xl border border-border bg-card"
      >
        {featured.image ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <img
              src={featured.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <span className="inline-block rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                {t("news.top_story")}
              </span>
              <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-white sm:text-xl">
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
            <h3 className="mt-2 text-lg font-bold leading-snug sm:text-xl">
              {featured.title}
            </h3>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {featured.source}
              {timeAgo(featured.pubDate) && ` · ${timeAgo(featured.pubDate)}`}
            </p>
          </div>
        )}
      </a>

      {/* Rest of the feed */}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rest.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-4 transition-colors hover:bg-secondary/50"
          >
            {n.image && (
              <img
                src={n.image}
                alt=""
                loading="lazy"
                className="h-20 w-28 flex-shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0 self-center">
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
