# Handoff Notes

## Branch

`codex/i18n-web3d-upgrade`

## Commits

- `e1eb512 Add localized narrative resources`
- `b2cc72d Enhance 3D scene atmosphere`
- latest: add campaign mission director and cinematic target feedback

## What Changed

- Added a professional localization layer under `src/i18n/`.
- Set English as the default language and added Simplified Chinese as a switchable locale.
- Moved UI, chapter, ending, character, and narrative copy into locale resources.
- Updated `plotData` to reference translation keys instead of storing player-facing text directly.
- Added locale-aware rendering for chapter selection, HUD, dialogue, summaries, and metadata.
- Expanded tests to cover default locale behavior, translation key parity, and plot translation references.
- Improved 3D presentation with terrain variation, paths, foliage, particles, animated water, animated banners, mouse-drag camera control, and wheel zoom.
- Added a mission tracker under `src/ui/MissionTracker.js` that derives chapter objective state from NPC objective flags and player distance.
- Added an in-game campaign orders HUD with localized progress text, target distances, completion state, and responsive mobile layout.
- Added 3D target feedback for NPC objectives: animated overhead markers, glowing ground rings, active-target emphasis, and completed-target state.
- Added a Three.js postprocessing pipeline with `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and `OutputPass` for richer highlights.
- Added explicit objective flags to each chapter scene so plot flags, NPCs, HUD objectives, and 3D markers remain aligned.
- Updated README and PlotEngine documentation to describe localization and the upgraded scene behavior.

## Verification

Commands run successfully:

```bash
npm test
npm run build
```

Test result:

- 20 passed / 0 failed

Browser checks performed at `http://127.0.0.1:5174/`:

- Default language renders in English.
- Chinese language toggle updates UI text and document metadata.
- Desktop viewport renders the first chapter 3D canvas.
- Mobile viewport renders the first chapter 3D canvas without obvious text overlap.
- Campaign orders HUD renders on desktop and mobile with `0/2 secured`, target names, and distances.
- Screenshot pixel checks confirmed nonblank desktop and mobile scene renders.
- Fresh browser console check showed no new warnings or errors after replacing deprecated Three.js usages.

## Known Notes

- `npm run build` still reports Vite bundle-size guidance because the main Three.js game chunk is over 500 kB.
- Vite also reports an ineffective dynamic import warning for `GameState.js`; it is already statically imported elsewhere, so the dynamic import in legacy fallback code does not split it into a separate chunk.
- The dev server was started with:

```bash
npm run dev -- --host 127.0.0.1
```

## Suggested Next Steps

- Consider splitting scene code by chapter so the initial bundle is smaller.
- Replace the legacy dialogue fallback paths with the data-driven `PlotEngine` path everywhere.
- Add lightweight browser smoke tests for language switching and first-chapter rendering.
- Add more physical scene boundaries or collision constraints so the player cannot walk through set pieces.
