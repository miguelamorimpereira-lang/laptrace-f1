import { queryOptions } from "@tanstack/react-query";

const BASE = "https://api.jolpi.ca/ergast/f1";
const MIN_INTERVAL = 120; // ms between upstream calls (well under the 5 req/s cap)
const MAX_ATTEMPTS = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class JolpicaRateLimitError extends Error {
  constructor(path: string) {
    super(`Jolpica API rate limited on ${path}`);
    this.name = "JolpicaRateLimitError";
  }
}

/* ---------- Upstream throttling ----------
 * Jolpica rate limits bursts, so every call goes through one queue with a
 * minimum spacing between requests, identical in-flight paths share a single
 * request, and 429s back off using the server's own Retry-After hint.
 */
let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_INTERVAL - (Date.now() - lastAt);
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    return task();
  });
  // Keep the queue alive even when a request fails.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const inflight = new Map<string, Promise<unknown>>();

function backoffMs(res: Response, attempt: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 5000);
  }
  return Math.min(500 * 2 ** attempt, 8000);
}

async function request<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE}${path}`);
    if (res.status === 429) {
      await sleep(backoffMs(res, attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Jolpica API error ${res.status} on ${path}`);
    const json = await res.json();
    return json.MRData as T;
  }
  throw new JolpicaRateLimitError(path);
}

async function get<T>(path: string): Promise<T> {
  const running = inflight.get(path);
  if (running) return running as Promise<T>;
  const p = schedule(() => request<T>(path)).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/* ---------- Types ---------- */
export interface Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality: string;
}
export interface Constructor {
  constructorId: string;
  name: string;
  nationality: string;
}
export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}
export interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}
export interface Circuit {
  circuitId: string;
  circuitName: string;
  Location: { locality: string; country: string; lat?: string; long?: string };
}
export interface Race {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: Circuit;
  Results?: RaceResult[];
  QualifyingResults?: QualifyingResult[];
  SprintResults?: RaceResult[];
}
export interface QualifyingResult {
  position: string;
  number: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}
export interface RaceResult {
  position: string;
  positionText: string;
  points: string;
  grid: string;
  laps: string;
  status: string;
  Driver: Driver;
  Constructor: Constructor;
  Time?: { time: string };
  FastestLap?: { rank: string; lap: string; Time: { time: string } };
}
export interface LapTiming {
  driverId: string;
  position: string;
  time: string;
}
export interface Lap {
  number: string;
  Timings: LapTiming[];
}

/* ---------- Fetchers ---------- */
export const getSeasons = () =>
  get<{ SeasonTable: { Seasons: { season: string }[] } }>(
    "/seasons/?limit=100&offset=24",
  ).then((d) => d.SeasonTable.Seasons.map((s) => s.season).reverse());

export const getDriverStandings = (season: string) =>
  get<{ StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } }>(
    `/${season}/driverstandings/?limit=50`,
  ).then((d) => d.StandingsTable.StandingsLists[0]?.DriverStandings ?? []);

export const getConstructorStandings = (season: string) =>
  get<{ StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] } }>(
    `/${season}/constructorstandings/?limit=50`,
  ).then((d) => d.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []);

export const getRaces = (season: string) =>
  get<{ RaceTable: { Races: Race[] } }>(`/${season}/races/?limit=50`).then(
    (d) => d.RaceTable.Races,
  );

export const getRaceResults = (season: string, round: string) =>
  get<{ RaceTable: { Races: Race[] } }>(`/${season}/${round}/results/?limit=50`).then(
    (d) => d.RaceTable.Races[0] ?? null,
  );

export const getQualifyingResults = (season: string, round: string) =>
  get<{ RaceTable: { Races: Race[] } }>(
    `/${season}/${round}/qualifying/?limit=100`,
  ).then((d) => d.RaceTable.Races[0] ?? null);

export const getSprintResults = (season: string, round: string) =>
  get<{ RaceTable: { Races: Race[] } }>(`/${season}/${round}/sprint/?limit=100`).then(
    (d) => d.RaceTable.Races[0] ?? null,
  );

/**
 * Jolpica caps `limit` at 100 timing rows per request, so a single call only
 * returns ~5 laps. Page through every timing row and merge them by lap number.
 */
export const getLaps = async (season: string, round: string): Promise<Lap[]> => {
  const PAGE = 100;
  const byNumber = new Map<string, Lap>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    let data: { total: string; RaceTable: { Races: { Laps: Lap[] }[] } };
    try {
      data = await get<typeof data>(
        `/${season}/${round}/laps/?limit=${PAGE}&offset=${offset}`,
      );
    } catch (err) {
      // Rate limited part-way through paging: keep the laps already fetched so
      // the page still renders instead of failing outright.
      if (byNumber.size > 0 && err instanceof JolpicaRateLimitError) break;
      throw err;
    }
    total = Number(data.total) || 0;
    const laps = data.RaceTable.Races[0]?.Laps ?? [];
    for (const lap of laps) {
      const existing = byNumber.get(lap.number);
      if (existing) existing.Timings.push(...lap.Timings);
      else byNumber.set(lap.number, { number: lap.number, Timings: [...lap.Timings] });
    }
    offset += PAGE;
    if (laps.length === 0) break;
  }

  return [...byNumber.values()].sort((a, b) => Number(a.number) - Number(b.number));
};

/* ---------- Query options ---------- */
export const seasonsQuery = () =>
  queryOptions({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: Infinity });

export const driverStandingsQuery = (season: string) =>
  queryOptions({
    queryKey: ["driverStandings", season],
    queryFn: () => getDriverStandings(season),
    staleTime: 60_000,
  });

export const constructorStandingsQuery = (season: string) =>
  queryOptions({
    queryKey: ["constructorStandings", season],
    queryFn: () => getConstructorStandings(season),
    staleTime: 60_000,
  });

export const racesQuery = (season: string) =>
  queryOptions({
    queryKey: ["races", season],
    queryFn: () => getRaces(season),
    staleTime: 60_000,
  });

export const raceResultsQuery = (season: string, round: string) =>
  queryOptions({
    queryKey: ["raceResults", season, round],
    queryFn: () => getRaceResults(season, round),
    staleTime: 60_000,
  });

export const qualifyingQuery = (season: string, round: string) =>
  queryOptions({
    queryKey: ["qualifying", season, round],
    queryFn: () => getQualifyingResults(season, round),
    staleTime: 60_000,
  });

export const sprintQuery = (season: string, round: string) =>
  queryOptions({
    queryKey: ["sprint", season, round],
    queryFn: () => getSprintResults(season, round),
    staleTime: 60_000,
  });

export const lapsQuery = (season: string, round: string) =>
  queryOptions({
    queryKey: ["laps", season, round],
    queryFn: () => getLaps(season, round),
    staleTime: 60_000,
  });

/* ---------- Helpers ---------- */
export const constructorColor = (id: string): string => {
  const map: Record<string, string> = {
    red_bull: "#3671C6",
    ferrari: "#E8002D",
    mercedes: "#27F4D2",
    mclaren: "#FF8000",
    aston_martin: "#229971",
    alpine: "#0093CC",
    williams: "#64C4FF",
    rb: "#6692FF",
    sauber: "#52E252",
    haas: "#B6BABD",
    alphatauri: "#5E8FAA",
    alfa: "#C92D4B",
    racing_point: "#F596C8",
    renault: "#FFF500",
    toro_rosso: "#469BFF",
  };
  return map[id] ?? "#9CA3AF";
};

export const lapTimeToSeconds = (t: string): number | null => {
  const m = t.match(/^(?:(\d+):)?(\d+)\.(\d+)$/);
  if (!m) return null;
  const min = m[1] ? parseInt(m[1], 10) : 0;
  const sec = parseInt(m[2], 10);
  const ms = parseInt(m[3].padEnd(3, "0").slice(0, 3), 10);
  return min * 60 + sec + ms / 1000;
};
