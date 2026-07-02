# F1 site: news home + per-session navigation

Restructure the app so users pick **year → race → session (Race / Qualifying / Sprint)** instead of landing on race data directly, add a **latest-news** home page, and add **Q1/Q2/Q3 telemetry** in qualifying.

## 1. Home page — latest news + race calendar

Rework `src/routes/index.tsx` to lead with news and the calendar (year-selectable):
- **Latest F1 news** feed: headline, source, time-ago, thumbnail (when present), linking out to the full article in a new tab.
- **Race calendar** for the selected season (year selector), each round linking into the Grand Prix hub. Upcoming vs finished badges (reuse logic from the current races list).
- Keep a slim championship-leader strip so the landing still surfaces standings, but news + calendar are the focus.

News comes from a server function (RSS has no browser CORS, and XML parsing belongs server-side):
- New `src/lib/news.functions.ts` → `getLatestNews` (`createServerFn`, GET) fetches the Autosport F1 RSS feed (`https://www.autosport.com/rss/f1/news/`, Motorsport.com as fallback), parses it with `fast-xml-parser`, and returns a clean DTO array (`title`, `link`, `pubDate`, `source`, `image?`). Cached via TanStack Query with a long `staleTime`.
- Add dependency `fast-xml-parser` (pure JS, Worker-safe).
- New `src/components/NewsFeed.tsx` renders the list.

## 2. Grand Prix hub with session tabs

Turn `src/routes/races.$round.tsx` into a **Grand Prix hub**. Header stays (GP name, circuit, date, back-to-calendar). Below it, a **session tab bar** driven by a `tab` search param: `race` (default) · `qualifying` · `sprint` · `sprint-qualifying`.
- Tabs only appear when that session exists for the weekend (Sprint tabs shown only for sprint weekends, detected via the OpenF1 sessions for that meeting).
- The circuit-layout sticky sidebar + hover-to-marker interaction is kept and shared across all telemetry views.

### Race tab
Exactly today's content: all-laps chart, fastest-lap-per-driver, fastest-lap telemetry, classification table.

### Qualifying tab
- **Q1 / Q2 / Q3 sub-selector.**
- For the chosen segment, show **best-lap telemetry per driver** (speed · throttle · brake · gear), same overlay chart as race, plus each driver's lap time.
- Data join: Jolpica `/qualifying` gives each driver's Q1/Q2/Q3 lap *time*; OpenF1's single Qualifying session gives the telemetry. For each selected driver we find the OpenF1 lap whose `lap_duration` best matches that driver's Jolpica Q-segment time, then pull that lap's telemetry. This yields genuinely segment-specific traces.
- Driver chips let the user pick up to 3 drivers to compare (reusing the existing selection UI).

### Sprint tab (sprint weekends only)
- Sprint race results + lap charts + fastest-lap telemetry, reusing the race components against the OpenF1 Sprint session and Jolpica `/sprint` results.

### Sprint Qualifying / Shootout tab (when present)
- Best-lap telemetry per driver for the Sprint Qualifying session. Ergast/Jolpica has no SQ1/SQ2/SQ3 split, so this shows each driver's overall fastest lap in that session (no sub-segments) with a short note.

## 3. Data layer additions

`src/lib/jolpica.ts`:
- `getQualifyingResults(season, round)` + `qualifyingQuery` — returns per-driver `Q1/Q2/Q3` strings (parsed to seconds with the existing `lapTimeToSeconds`).
- `getSprintResults(season, round)` + `sprintQuery` — `/sprint` endpoint, same shape as race results.

`src/lib/openf1.ts`:
- Generalize session resolution: `resolveSession(year, raceDate, sessionName)` matching by date to the GP weekend (works for `Race`, `Qualifying`, `Sprint`, `Sprint Qualifying`/`Sprint Shootout`). Keep `getRaceSession` as a thin wrapper.
- `listWeekendSessions(year, raceDate)` so the hub knows which tabs to show.
- `getLapByDuration(sessionKey, driverNumber, targetSeconds)` — pick the valid lap closest to a target time (for Q-segment matching); reuse `getLapTelemetry`.
- New query option `segmentTelemetryQuery(sessionKey, driverNumber, targetSeconds)`.

## 4. Telemetry component refactor

Generalize the current `TelemetrySection` into a reusable telemetry view that accepts a resolved **session** and an optional **per-driver target lap time** (used by qualifying segments; omitted for race/sprint where "fastest lap" is used). The existing rate-limited OpenF1 request queue, driver mapping, merge, and hover-distance wiring are preserved. The race tab keeps its current behavior; qualifying/sprint reuse the same component with different inputs.

## Technical notes / caveats
- Telemetry (all sessions) remains **2023+** only via OpenF1; pre-2023 races show lap-time charts + results but a clear "telemetry unavailable" note.
- Q1/Q2/Q3 telemetry relies on **duration matching** between Jolpica times and OpenF1 laps — robust in practice since each driver's Q times are distinct, with a small tolerance guard.
- No steering channel (not published by any free source), consistent with the current build.
- OpenF1's live-session lockout handling and the existing throttling/back-off are unchanged.
- News is read-only and server-fetched; no secrets or database required.

## Files
- Edit: `src/routes/index.tsx`, `src/routes/races.$round.tsx`, `src/lib/jolpica.ts`, `src/lib/openf1.ts`, `src/components/TelemetrySection.tsx`.
- Add: `src/lib/news.functions.ts`, `src/components/NewsFeed.tsx`, a `SessionTabs` control, and a qualifying segment selector (small components).
- Dependency: `fast-xml-parser`.
