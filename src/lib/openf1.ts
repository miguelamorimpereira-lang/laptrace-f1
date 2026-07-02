import { queryOptions } from "@tanstack/react-query";

const BASE = "https://api.openf1.org/v1";

/**
 * OpenF1 allows ~3 requests/second for anonymous clients. We serialize every
 * request through a single promise chain with a minimum spacing so parallel
 * telemetry queries never trip the rate limiter, and we retry on 429.
 */
const MIN_INTERVAL = 400; // ms between requests (~2.5 req/s, safely under the cap)
let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_INTERVAL - (Date.now() - lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return task();
  });
  // Keep the chain alive even if a task rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenF1 only has data from 2023 onward, and it blocks global access while a
 * live session is in progress (returns a JSON object instead of an array).
 * Every fetch goes through here so we can surface a clean, typed error.
 */
async function get<T>(path: string): Promise<T[]> {
  return schedule(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${BASE}${path}`);
      } catch {
        // OpenF1 drops CORS headers on its error responses, so a live-session
        // lock surfaces here as a network/CORS failure rather than clean JSON.
        throw new Error(
          "OpenF1 telemetry is temporarily unavailable — it gets locked while a live session is running. Try again once the current session has finished.",
        );
      }

      if (res.status === 429) {
        // Back off and retry — spacing widens with each attempt.
        await sleep(700 * (attempt + 1));
        continue;
      }

      const json = await res.json();
      if (!Array.isArray(json)) {
        const detail =
          json && typeof json === "object" && "detail" in json
            ? String((json as { detail: unknown }).detail)
            : null;
        if (detail && /rate limit/i.test(detail)) {
          await sleep(700 * (attempt + 1));
          continue;
        }
        if (detail && /live/i.test(detail)) {
          throw new Error(
            "OpenF1 telemetry is temporarily locked while a live session is running. Try again once the current session has finished.",
          );
        }
        throw new Error(detail ?? "OpenF1 returned an unexpected response.");
      }
      if (!res.ok) throw new Error(`OpenF1 API error ${res.status} on ${path}`);
      return json as T[];
    }
    throw new Error(
      "OpenF1 is rate-limiting requests right now. Please wait a moment and try again.",
    );
  });
}

/* ---------- Types ---------- */
export interface OF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
  year: number;
  country_name: string;
  circuit_short_name: string;
}
export interface OF1Driver {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  first_name: string;
  last_name: string;
  team_name: string;
  team_colour: string;
}
export interface OF1Lap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  date_start: string | null;
  is_pit_out_lap: boolean;
}
export interface OF1CarData {
  driver_number: number;
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  drs: number;
  rpm: number;
}

export interface TelemetrySample {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: number;
}

export const OPENF1_MIN_SEASON = 2023;

/* ---------- Fetchers ---------- */

/** All OpenF1 sessions belonging to the same meeting (weekend) as `raceDate`. */
async function getWeekendSessions(
  year: number,
  raceDate: string,
): Promise<OF1Session[]> {
  const sessions = await get<OF1Session>(`/sessions?year=${year}`);
  if (sessions.length === 0) return [];
  const target = new Date(`${raceDate}T12:00:00Z`).getTime();
  // Find the session closest to the race date, then take its whole meeting.
  let best = sessions[0];
  let bestDiff = Infinity;
  for (const s of sessions) {
    const diff = Math.abs(new Date(s.date_start).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  if (bestDiff > 4 * 24 * 60 * 60 * 1000) return [];
  return sessions.filter((s) => s.meeting_key === best.meeting_key);
}

/** Session names we surface as tabs, in weekend order. */
export type SessionKind = "race" | "qualifying" | "sprint" | "sprint-qualifying";

const KIND_MATCHERS: Record<SessionKind, (name: string) => boolean> = {
  race: (n) => n === "Race",
  qualifying: (n) => n === "Qualifying",
  sprint: (n) => n === "Sprint",
  "sprint-qualifying": (n) =>
    n === "Sprint Qualifying" || n === "Sprint Shootout",
};

export interface WeekendSessions {
  kinds: SessionKind[];
  byKind: Partial<Record<SessionKind, OF1Session>>;
}

/** Which session tabs a weekend supports, plus the resolved session per kind. */
export async function getWeekendSessionKinds(
  year: number,
  raceDate: string,
): Promise<WeekendSessions> {
  const sessions = await getWeekendSessions(year, raceDate);
  const order: SessionKind[] = [
    "race",
    "qualifying",
    "sprint",
    "sprint-qualifying",
  ];
  const byKind: Partial<Record<SessionKind, OF1Session>> = {};
  for (const kind of order) {
    const match = sessions.find((s) => KIND_MATCHERS[kind](s.session_name));
    if (match) byKind[kind] = match;
  }
  const kinds = order.filter((k) => byKind[k]);
  return { kinds, byKind };
}

/** Find the Race session whose calendar date best matches the Jolpica race date. */
async function resolveRaceSession(
  year: number,
  raceDate: string,
): Promise<OF1Session | null> {
  const { byKind } = await getWeekendSessionKinds(year, raceDate);
  return byKind.race ?? null;
}

export const getRaceSession = (year: number, raceDate: string) =>
  resolveRaceSession(year, raceDate);

export const getSessionDrivers = (sessionKey: number) =>
  get<OF1Driver>(`/drivers?session_key=${sessionKey}`);

/** Each driver's single fastest valid (non pit-out) lap in the session. */
export async function getFastestLap(
  sessionKey: number,
  driverNumber: number,
): Promise<OF1Lap | null> {
  const laps = await get<OF1Lap>(
    `/laps?session_key=${sessionKey}&driver_number=${driverNumber}`,
  );
  const valid = laps.filter(
    (l) => l.lap_duration != null && !l.is_pit_out_lap && l.date_start != null,
  );
  if (valid.length === 0) return null;
  return valid.reduce((a, b) =>
    (a.lap_duration as number) <= (b.lap_duration as number) ? a : b,
  );
}

/**
 * Find the valid lap whose duration best matches a target time (seconds).
 * Used to pin a driver's Q1/Q2/Q3 lap (whose time comes from Jolpica) to the
 * matching lap inside OpenF1's single Qualifying session.
 */
export async function getLapByDuration(
  sessionKey: number,
  driverNumber: number,
  targetSeconds: number,
): Promise<OF1Lap | null> {
  const laps = await get<OF1Lap>(
    `/laps?session_key=${sessionKey}&driver_number=${driverNumber}`,
  );
  const valid = laps.filter(
    (l) => l.lap_duration != null && l.date_start != null,
  );
  if (valid.length === 0) return null;
  let best = valid[0];
  let bestDiff = Infinity;
  for (const l of valid) {
    const diff = Math.abs((l.lap_duration as number) - targetSeconds);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = l;
    }
  }
  // If nothing is remotely close, the segment lap isn't in the stream.
  if (bestDiff > 2) return null;
  return best;
}

/** Telemetry samples for one lap, with cumulative distance derived from speed. */
export async function getLapTelemetry(
  sessionKey: number,
  driverNumber: number,
  lap: OF1Lap,
): Promise<TelemetrySample[]> {
  if (!lap.date_start || lap.lap_duration == null) return [];
  const start = new Date(lap.date_start).getTime();
  const end = start + lap.lap_duration * 1000 + 500;
  const startIso = new Date(start - 200).toISOString();
  const endIso = new Date(end).toISOString();
  const raw = await get<OF1CarData>(
    `/car_data?session_key=${sessionKey}&driver_number=${driverNumber}` +
      `&date>=${startIso}&date<=${endIso}`,
  );
  const rows = raw
    .map((r) => ({ ...r, t: new Date(r.date).getTime() }))
    .filter((r) => Number.isFinite(r.speed))
    .sort((a, b) => a.t - b.t);
  if (rows.length === 0) return [];

  const out: TelemetrySample[] = [];
  let distance = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) {
      const dt = (rows[i].t - rows[i - 1].t) / 1000; // seconds
      const v = rows[i - 1].speed / 3.6; // m/s
      distance += v * dt;
    }
    out.push({
      distance,
      speed: rows[i].speed,
      throttle: rows[i].throttle,
      brake: rows[i].brake > 0 ? 100 : 0,
      gear: rows[i].n_gear,
      drs: rows[i].drs >= 10 ? 1 : 0,
    });
  }
  return out;
}

/* ---------- Query options ---------- */
const HOUR = 60 * 60 * 1000;

export const raceSessionQuery = (year: number, raceDate: string) =>
  queryOptions({
    queryKey: ["of1-session", year, raceDate],
    queryFn: () => getRaceSession(year, raceDate),
    staleTime: 24 * HOUR,
    retry: false,
  });

export const sessionDriversQuery = (sessionKey: number | undefined) =>
  queryOptions({
    queryKey: ["of1-drivers", sessionKey],
    queryFn: () => getSessionDrivers(sessionKey as number),
    enabled: sessionKey != null,
    staleTime: 24 * HOUR,
    retry: false,
  });

export const lapTelemetryQuery = (
  sessionKey: number | undefined,
  driverNumber: number | undefined,
) =>
  queryOptions({
    queryKey: ["of1-telemetry", sessionKey, driverNumber],
    queryFn: async () => {
      const lap = await getFastestLap(sessionKey as number, driverNumber as number);
      if (!lap) return { lap: null, samples: [] as TelemetrySample[] };
      const samples = await getLapTelemetry(
        sessionKey as number,
        driverNumber as number,
        lap,
      );
      return { lap, samples };
    },
    enabled: sessionKey != null && driverNumber != null,
    staleTime: 24 * HOUR,
    retry: false,
  });

/* ---------- Resampling helpers ---------- */

/** Linear-interpolate a channel value at distance `d` (null outside range). */
function sampleAt(
  samples: TelemetrySample[],
  d: number,
  key: keyof TelemetrySample,
): number | null {
  if (samples.length === 0) return null;
  if (d < samples[0].distance || d > samples[samples.length - 1].distance)
    return null;
  // binary search for the bracketing pair
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].distance <= d) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  if (b.distance === a.distance) return a[key] as number;
  const f = (d - a.distance) / (b.distance - a.distance);
  return (a[key] as number) + f * ((b[key] as number) - (a[key] as number));
}

export interface TelemetryDriverSeries {
  code: string;
  color: string;
  samples: TelemetrySample[];
}

export interface MergedTelemetry {
  rows: Record<string, number | null>[];
  maxDistance: number;
}

/** Build a single merged dataset over a common distance grid for overlay charts. */
export function mergeTelemetry(
  series: TelemetryDriverSeries[],
  step = 20,
): MergedTelemetry {
  const maxDistance = Math.max(
    0,
    ...series.map((s) =>
      s.samples.length ? s.samples[s.samples.length - 1].distance : 0,
    ),
  );
  const rows: Record<string, number | null>[] = [];
  for (let d = 0; d <= maxDistance; d += step) {
    const row: Record<string, number | null> = { distance: Math.round(d) };
    for (const s of series) {
      row[`${s.code}_speed`] = round(sampleAt(s.samples, d, "speed"));
      row[`${s.code}_throttle`] = round(sampleAt(s.samples, d, "throttle"));
      row[`${s.code}_brake`] = round(sampleAt(s.samples, d, "brake"));
      row[`${s.code}_gear`] = roundGear(sampleAt(s.samples, d, "gear"));
      row[`${s.code}_drs`] = roundGear(sampleAt(s.samples, d, "drs"));
    }
    rows.push(row);
  }
  return { rows, maxDistance };
}

function round(v: number | null): number | null {
  return v == null ? null : Math.round(v * 10) / 10;
}
function roundGear(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}

export function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const rest = (seconds - m * 60).toFixed(3);
  return m > 0 ? `${m}:${rest.padStart(6, "0")}` : `${rest}s`;
}
