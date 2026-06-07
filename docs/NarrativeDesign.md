# Narrative Design Notes

This project should grow like a narrative engine with replaceable data, not like a pile of hard-coded scenes. The current target is a playable historical campaign where deeper writing can be swapped in through `src/data/plotData.js` and locale resources.

## Content Scale

For the current lightweight web game, a practical content target is:

- **Essential path**: 1 required interaction per chapter, 1 meaningful decision, 5-8 minutes for the full campaign.
- **Guided path**: 2 required interactions per chapter, 2-4 decisions, 12-20 minutes for the full campaign.
- **Free exploration path**: 2 required interactions plus optional gated branches, 4-7 decisions per chapter, 25-45 minutes for the full campaign.

For a more classic narrative game, content usually needs repeated choice consequences rather than simply more text. A good chapter should include a tactical decision, a personal or moral decision, a consequence check, and at least one later callback.

## Campaign Depth Modes

The game now supports three depth modes:

- **Essential Campaign**: critical path only. This is for players who want the main historical arc with minimal friction.
- **Main Story + Branches**: main arc plus curated side material. This is the recommended first-run mode.
- **Free Exploration**: widest branch set. This is where optional scenes, score gates, route locks, and hidden consequences should appear.

All three modes should use the same graph. Add `minMode`, `maxMode`, or `storyModes` to interactions, choices, and condition routes instead of creating separate plot files.

## Branching Shape

The preferred structure is a controlled web:

1. Start each chapter in an `explore` hub.
2. Let NPC interactions open short dialogue branches.
3. Record choices through score impacts and flags.
4. Return to the hub until chapter requirements are met.
5. Use a `condition` node to choose the payoff, event, or next chapter.

This keeps the player free to choose order while still letting production scope stay manageable.

## Data-First Expansion Checklist

When adding a more complex chapter:

- Add new graph nodes in `src/data/plotData.js`.
- Add localized text in both `src/i18n/locales/en.js` and `src/i18n/locales/zh-CN.js`.
- Use flags for remembered player choices.
- Use score gates for accumulated play style.
- Use `minMode` or `maxMode` to control how much content appears in each campaign depth.
- Add scene code only if a branch needs new 3D objects, NPCs, or visual events.
- Add tests for routes that can skip, loop, lock, or jump to a different chapter.

## Current Example

Chapter II now has a Free Exploration-only signal-chain choice. If the player chooses it and has enough strategy, the plot graph triggers `harbor_signal` before the normal artillery event. This is intentionally small, but it proves the desired pattern: later complexity can be added by changing data and translations while the engine keeps doing the same job.
