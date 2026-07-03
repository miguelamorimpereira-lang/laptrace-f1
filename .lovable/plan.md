# Lap Trace F1 — Rebrand, Theming & Multi-language

Four changes: rebrand to "Lap Trace F1" with the logo image and its blue/red colors, a bolder home page with larger news + imagery, a light/dark toggle (defaulting to the visitor's system setting), and full UI translation across 6 languages.

## 1. Branding: "Lap Trace F1" + logo

- Upload the provided logo to the CDN (via lovable-assets) and use it in the header instead of the "F1 / Apex Data" text mark.
- Replace every "Apex Data" string with "Lap Trace F1" (found in `src/routes/races.index.tsx` page title, and anywhere else in metadata/nav).
- Add the logo as a graphic in the home hero to bring in color/imagery.

## 2. Color palette from the logo

The logo is **racing blue** + **red** on light gray. Update the design tokens in `src/styles.css`:

- Keep **red** as the primary accent.
- Add **blue** as a secondary/accent token used for links, upcoming-race badges, and chart lines.
- Introduce both a **light theme** (`:root`) and **dark theme** (`.dark`) token set so the toggle works. Currently only dark values exist.
- Apply blue/red accents to stat cards, section headers, and calendar cards so the UI is more colorful (no hardcoded colors — all via tokens).

## 3. Light / Dark mode toggle

- Add a theme toggle (sun/moon) at the top-right of the nav.
- Default follows the **system** preference; the user's manual choice is saved to `localStorage` and wins on return visits.
- A tiny pre-hydration script in `__root.tsx` sets the `.dark` class before paint to avoid a flash / hydration mismatch.

## 4. Multi-language (English, Portuguese, Swedish, French, Spanish, German)

- Add a language selector (globe dropdown) at the top-right of the nav next to the theme toggle.
- A lightweight in-app translation layer (React context + `useT()` hook) with one dictionary per language holding all interface strings: nav labels, hero copy, section titles ("Latest F1 News", "Race Calendar", "Standings"), stat labels, buttons, race status ("Finished"/"Upcoming"), telemetry labels, etc.
- Selected language saved to `localStorage`; defaults to the browser language if it's one of the six, otherwise English.
- Dates reformat to the chosen locale.
- **Note:** F1 news headlines come from an external English news feed and will remain in their source language — only the app's own interface text is translated.

## 5. Bigger news + imagery

- Give **Latest F1 News** more prominence: move it higher / widen it, show larger article thumbnails and a bigger headline for the top story.
- Increase image sizes in the news feed cards.
- Add subtle blue→red accent treatments to the hero and cards for a livelier, more colorful look.

## Technical notes

- i18n: custom lightweight context (no heavy dependency) with typed keys and 6 dictionaries under `src/lib/i18n/`. A `LanguageProvider` wraps the app in `__root.tsx`; components call `useT()`.
- Theming: standard shadcn dual-token pattern (`:root` light + `.dark` dark) already scaffolded via `@theme inline`; add a `ThemeProvider`/toggle and the pre-hydration `ScriptOnce`.
- Logo served from CDN via an `.asset.json` pointer, imported where needed.
- Files touched: `src/styles.css`, `src/routes/__root.tsx`, `src/components/Nav.tsx`, `src/routes/index.tsx`, `src/components/NewsFeed.tsx`, `src/routes/races.index.tsx`, plus new `src/lib/i18n/*`, `src/components/ThemeToggle.tsx`, `src/components/LanguageSelect.tsx`. Other route/component text gets wired to `useT()` incrementally in the same pass.

Both toggles live at the top of the site on every page, so the choices persist as you navigate.