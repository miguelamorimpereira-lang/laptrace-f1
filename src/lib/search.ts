export type SeasonSearch = { season?: string };

/**
 * Returns an object whose `season` key is only present when a real value is in
 * the URL, so the router treats `season` as an optional search param and links
 * to these routes don't have to pass `search`.
 */
export function seasonSearch(s: Record<string, unknown>): SeasonSearch {
  const raw = s.season;
  if (typeof raw !== "string" || raw === "") return {};
  return { season: raw };
}
