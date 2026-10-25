# Lap Trace F1 + Circle of Doom

## Run the website (VS Code)
1. Install Node.js 20+ (nodejs.org) or Bun (bun.sh).
2. Open this folder in VS Code (File > Open Folder).
3. In the VS Code terminal: `npm install` (or `bun install`), then `npm run dev` (or `bun run dev`).
4. Open the local URL it prints, go to Races, pick a race: "Pit Strategy — Circle of Doom" is the first section.

## New files
- src/lib/strategy.ts: pit-stop "what if" logic
- src/components/CircleOfDoom.tsx: the clock UI
- src/routes/races.$round.tsx: now renders the new section
- python/pitstrategy_prototype.py: same model in Python

## Python prototype (Spyder or Google Colab)
Open python/pitstrategy_prototype.py in Spyder, install `requests` and `matplotlib` if missing, change the season/round at the bottom, and run.
