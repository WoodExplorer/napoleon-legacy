# Handoff Notes

## Branch

`codex/i18n-web3d-upgrade`

## Commits

- `e1eb512 Add localized narrative resources`
- `b2cc72d Enhance 3D scene atmosphere`
- `8aad011 Add campaign mission director`
- `0ffbb7f Add world navigation constraints`
- `a8ae0e7 Lazy load 3D chapters`
- `8dfa12f Add cinematic chapter intros`
- add procedural audio director and sound controls
- add runtime graphics quality presets
- add a product settings panel
- add performance HUD telemetry
- add optional auto quality
- add low-FPS quality recommendation
- add auto quality adjustment feedback
- latest: add camera sensitivity settings

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
- Added `src/core/MovementPhysics.js` for tested world bounds, circle collision, box collision, and combined navigation resolution.
- Added chapter-level `worldBounds` and `collisionObjects` across all seven scenes for major buildings, terrain props, water edges, hills, trees, benches, banners, and NPC blockers.
- Updated movement handling so the player is constrained by scene geometry and does not keep walking in place when fully blocked.
- Added `src/scenes/SceneRegistry.js` so chapters load through dynamic imports instead of static entrypoint imports.
- Converted `GameEngine` to a lazy import so Three.js and postprocessing code load when a chapter starts, not on the main menu.
- Reworked `startChapter` to load the engine, plot engine, plot data, and selected chapter scene in parallel with a localized chapter-loading overlay.
- Removed the legacy dynamic `GameState.js` fallback import from `GameEngine`, replacing it with the active `gameState` reference passed into the engine.
- Tuned Vite's chunk warning budget to account for the expected isolated Three.js vendor chunk while keeping app chunks small.
- Added `src/core/CinematicDirector.js` for tested chapter intro camera interpolation, easing, and overlay fade behavior.
- Added an in-game cinematic intro overlay with localized chapter theater label, chapter number, year, title, description, progress line, and skip button.
- Updated `GameEngine` to lock player control during chapter intros, animate from an establishing camera to the default third-person camera, and release control after completion or skip.
- Added `src/core/AudioDirector.js` for procedural Web Audio ambience, UI pulses, footsteps, and event impacts without external audio assets.
- Wired audio feedback into chapter loading, movement, dialogue interaction, cinematic skip, and plot events such as artillery fire.
- Added an in-game audio toggle with localized labels and graceful degradation when Web Audio is unavailable or blocked by the browser.
- Added `src/core/GraphicsSettings.js` for tested low, balanced, and cinematic graphics presets.
- Wired runtime graphics quality into `GameEngine`: pixel ratio cap, shadow enable/type/map size, Bloom settings, and tone-mapping exposure now update together.
- Added a small HUD graphics button that cycles presets, persists the choice, and exposes localized title/ARIA labels.
- Added a localized settings panel reachable from the main menu and pause menu, with explicit low/balanced/cinematic graphics choices backed by the same graphics preset model.
- Added `src/core/PerformanceMonitor.js` for tested rolling FPS sampling, compact labels, and frame-rate health classifications.
- Added a compact in-game FPS/quality HUD badge that updates from the render loop and shares the active graphics preset state.
- Added `src/core/AutoQuality.js` for tested sustained-pressure downgrade decisions with cooldown protection.
- Added an optional Auto Quality settings switch; when enabled, low FPS telemetry can automatically step graphics down one preset and persist the safer quality.
- Added a tested low-FPS recommendation controller for manual mode, plus a localized in-game toast that can enable Auto Quality or be dismissed.
- Added a localized auto-quality adjustment toast so players are told when Auto Quality lowers graphics to a safer preset.
- Added `src/core/CameraSettings.js` for tested camera sensitivity persistence, range clamping, and percentage formatting.
- Added a settings-panel camera sensitivity slider that affects mouse drag, keyboard camera turn, and mobile look speed.
- Updated README and PlotEngine documentation to describe localization and the upgraded scene behavior.

## Verification

Commands run successfully:

```bash
npm test
npm run build
```

Test result:

- 48 passed / 0 failed

Browser checks performed at `http://127.0.0.1:5175/`:

- Default language renders in English.
- Chinese language toggle updates UI text and document metadata.
- Desktop viewport renders the first chapter 3D canvas.
- Mobile viewport renders the first chapter 3D canvas without obvious text overlap.
- Campaign orders HUD renders on desktop and mobile with `0/2 secured`, target names, and distances.
- Screenshot pixel checks confirmed nonblank desktop and mobile scene renders.
- Fresh browser console check showed no new warnings or errors after replacing deprecated Three.js usages.
- Production build now emits separate chunks for the main menu, GameEngine, PlotEngine, plot data, Three.js, and each chapter scene.
- Chapter intro overlay renders on first chapter load, fades/skips correctly, and leaves the mission HUD/canvas active afterward.
- Audio toggle renders in the game HUD, toggles muted state, and keeps the scene running without console errors.
- Graphics quality button renders in the game HUD, starts on balanced, cycles to cinematic, updates its localized tooltip/title, and keeps the scene running without console errors.
- Settings panel renders from the main menu, highlights the active graphics preset, and applies the selected preset before a chapter is loaded.
- Pause menu settings opens while the game is paused, applies graphics changes immediately, and returns to the pause menu when closed.
- Performance badge renders in the first chapter HUD, reports live FPS and active quality shorthand, and updates when the graphics preset changes.
- Auto Quality toggle persists through settings, the HUD badge marks auto mode with `A`, and the first chapter keeps rendering with no console errors or warnings.
- Low-FPS recommendation toast is present, localized, hidden by default, and does not disturb the first chapter HUD layout when inactive; prompt trigger/cooldown behavior is covered by unit tests.
- Auto-quality adjustment toast shell is present, localized through the shared translation system, hidden by default, and does not disturb the first chapter HUD layout when inactive.
- Camera sensitivity slider renders in the settings panel, defaults to 100%, updates to 140% when dragged, persists before chapter load, and the first chapter still renders without console errors.

## Known Notes

- The Three.js vendor chunk is still large by nature, but it is no longer part of the initial main menu chunk.
- The dev server was started with:

```bash
npm run dev -- --host 127.0.0.1
```

## Suggested Next Steps

- Consider adding prefetching for the next unlocked chapter after the current scene becomes interactive.
- Replace the legacy dialogue fallback paths with the data-driven `PlotEngine` path everywhere.
- Add lightweight browser smoke tests for language switching and first-chapter rendering.
- Add authored per-chapter camera paths and keyframed scene events for the intro director.
- Replace procedural tones with authored music/SFX assets once an asset pipeline exists.
- Add subtitle display and accessibility contrast controls to the settings panel.
