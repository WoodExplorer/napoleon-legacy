# Napoleon's Legacy

Napoleon's Legacy is a web-based 3D interactive history game. The player guides Napoleon through major historical turning points, makes strategic and personal choices, and shapes scores for strategy, diplomacy, loyalty, legacy, and humanity.

## Core Features

- **Dynamic 3D chapters**: Three.js scenes with terrain, particles, water, banners, historical props, and chapter-specific atmosphere.
- **Data-driven narrative graph**: `PlotEngine` runs a node graph from `src/data/plotData.js`, so writers can add branches, conditions, flags, and route gates without rewriting 3D scene code.
- **Campaign depth modes**: new games can run as Essential Campaign, Main Story + Branches, or Free Exploration. The same plot graph adapts by filtering interactions and choices through data rules.
- **Localized resources**: English is the default locale. Simplified Chinese is available through `src/i18n/locales/zh-CN.js`. UI, chapter, character, and plot text use translation keys.
- **Scene events from plot data**: narrative nodes can trigger scene events such as artillery fire or signal chains.
- **Mission director**: the HUD tracks active objectives, progress, distance to targets, completion state, target markers, and a collapsible campaign-orders panel.
- **Objective compass**: a centered compass points toward the nearest active objective.
- **Interaction director**: NPC prompts shift from approach guidance to a stable close-range `E` interaction state.
- **Navigation constraints**: chapter scenes define world bounds and collision objects so exploration stays inside the playable space.
- **Cinematic presentation**: chapter intros, dialogue camera framing, third-person camera follow, postprocessing bloom, and runtime graphics presets are all built into the engine.
- **Procedural audio and music**: Web Audio generates ambience, UI feedback, footsteps, event impacts, and a light composed music layer without external audio assets.
- **Lazy-loaded architecture**: Three.js, the game engine, plot data, and chapter scenes load only when a chapter starts.

## Project Structure

```text
src/
├── core/         # GameEngine, PlotEngine, GameState, camera, audio, graphics, movement, settings
├── data/         # Plot graph data
├── i18n/         # Translation resources and localization helpers
├── scenes/       # Lazy-loaded 3D chapter scenes
├── dialogue/     # Dialogue UI rendering
├── characters/   # Procedural character model helpers
├── controls/     # Keyboard, mouse, and mobile input
├── ui/           # Mission tracker, compass, chapter metadata, summary UI
└── tests/        # Native JavaScript unit tests
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run unit tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Documentation

- [PlotEngine Guide](./docs/PlotEngine.md): how to write and extend narrative graph data.
- [Narrative Design Notes](./docs/NarrativeDesign.md): recommended content scale, campaign depth modes, and data-first expansion rules.
- [Handoff Notes](./docs/HANDOFF.md): session bookkeeping, verification history, and suggested next steps.
