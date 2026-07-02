import type { NewsItem } from "@/lib/news.functions";

function timeAgo(pubDate: string | null): string {
  if (!pubDate) return "";
  const t = new Date(pubDate).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          F1 news is temporarily unavailable. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((n) => (
        <a
          key={n.link}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-4 p-4 transition-colors hover:bg-secondary/40"
        >
          {n.image && (
            <img
              src={n.image}
              alt=""
              loading="lazy"
              className="h-16 w-24 flex-shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium leading-snug">
              {n.title}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {n.source}
              {timeAgo(n.pubDate) && ` · ${timeAgo(n.pubDate)}`}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
