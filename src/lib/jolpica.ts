import { queryOptions } from "@tanstack/react-query";

const BASE = "https://api.jolpi.ca/ergast/f1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Jolpica API error ${res.status} on ${path}`);
  const json = await res.json();
  return json.MRData as T;
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
  Location: { locality: string; country: string };
}
export interface Race {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: Circuit;
  Results?: RaceResult[];
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

export const getLaps = (season: string, round: string) =>
  get<{ RaceTable: { Races: { Laps: Lap[] }[] } }>(
    `/${season}/${round}/laps/?limit=2000`,
  ).then((d) => d.RaceTable.Races[0]?.Laps ?? []);

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
