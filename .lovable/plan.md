# Plan: Sync telemetry hover to a track-position marker

Make the track layout show *where on the circuit* the mouse currently is when hovering the telemetry charts. As you move across the Speed/Throttle/Brake/Gear traces, a dot moves around the track outline, so you can tell which corner or straight a data point belongs to.

## How it works (concept)

- Telemetry already has a cumulative `distance` per sample (0 → lap length).
- The track outline is a polyline of coordinates; walking it gives a distance-along-track for every point.
- On hover at telemetry distance `d`, compute `fraction = d / maxDistance`, then find the point at that same fraction along the track and draw a marker there.
- Alignment is by *fraction*, so exact meter-matching isn't required. Start/finish offset and drawing direction are handled as best-effort (see technical notes).

## User-facing result

- Hovering anywhere on the telemetry chart highlights the matching spot on the circuit map with a pulsing dot.
- A small readout (e.g. "2.41 km / 4.32 km") near the track confirms position.
- Moving the mouse off the chart clears the marker.

## Steps

1. **Shared hover state** — In the race detail page (`races.$round.tsx`), hold a `hoverDistance` / `maxDistance` state and pass a setter into the telemetry section and the current distance into the track map. This connects the two sections that already sit side-by-side in the grid.

2. **Report hover from the chart** — In `TelemetryChart.tsx`, use Recharts' `onMouseMove` / `onMouseLeave` on the chart to read the active `distance` value and call the setter. All channels share the same X (distance), so one handler on the top chart is enough.

3. **Arc-length lookup on the track** — In `circuits.ts`, add a helper that, given a matched circuit feature and a fraction (0–1), returns the projected SVG `{x, y}` at that fraction of total track length (cumulative haversine along the polyline, mapped through the same projection as `buildTrackPath`).

4. **Marker on the map** — In `TrackMap.tsx`, accept an optional `positionFraction` and render a highlighted dot at the computed point (plus keep the existing start/finish marker). Add the small distance readout.

5. **Wire max distance** — Surface `maxDistance` from the merged telemetry up to the page so the fraction can be computed.

## Technical notes

- **Direction/orientation**: The GeoJSON polyline may be digitized opposite to driving direction. I'll add a simple heuristic (and if needed a per-map flip) so the dot travels the right way; this can be refined after a visual check.
- **Start/finish offset**: The polyline's first point is assumed ≈ start/finish. If it's visibly off, we can add a per-circuit offset later; not part of this pass.
- **No new data sources or backend** — purely frontend wiring over data we already fetch. No changes to Jolpica/OpenF1 fetching.
- **Scope**: telemetry section only exists for 2023+ races, so the marker only activates there; older races keep the static track map.

## Out of scope

- Perfect metre-accurate start/finish calibration per circuit.
- Corner names/labels on the track (could be a later enhancement).
