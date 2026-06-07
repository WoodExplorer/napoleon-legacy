# PlotEngine Guide

`PlotEngine` is the game's data-driven narrative runtime. It separates story structure from `GameEngine` and the individual 3D chapter scenes. Writers should be able to change most narrative complexity by editing `src/data/plotData.js` and the locale files under `src/i18n/locales/`.

Player-facing copy should not be hard-coded in the plot graph. Nodes use `speakerKey`, `textKey`, and `choice.textKey`, and the runtime localizes them before the dialogue UI renders.

## Core Model

The plot is a graph of named nodes. The engine starts at a node ID, executes that node, then moves to another node through `next`, a player choice, an interaction, or a condition route.

Node IDs should be globally unique and chapter-prefixed, for example `ch2_gen_q1`.

## Supported Node Types

### `explore`

Enters 3D exploration mode. When the player interacts with an NPC, the `interactions` map routes that NPC's `dialogueId` to another node.

```js
ch2_start: {
  type: 'explore',
  interactions: {
    general: 'ch2_gen_start',
    junot: { next: 'ch2_junot_start', minMode: 'guided' },
  },
}
```

Interaction values can be a string node ID or a gated route object. Gated interactions are also used by the mission tracker and objective markers, so inactive branches are hidden from the HUD.

### `dialog`

Shows a dialogue line. A node may have no choices and advance through `next`, or it may show a list of choices.

```js
ch2_gen_q1: {
  type: 'dialog',
  speakerKey: 'characters.napoleon',
  portraitColor: '#1a3a5c',
  textKey: 'plot.ch2.general.q1',
  choices: [
    {
      textKey: 'plot.ch2.general.choices.force',
      impact: { strategy: 12, legacy: 8 },
      next: 'ch2_gen_a1_force',
    },
  ],
}
```

Choices can include the same gates as condition routes. They can also set or unset flags:

```js
{
  textKey: 'plot.ch2.general.choices.signal',
  minMode: 'free',
  setFlags: { ch2_signal_harbor: true },
  impact: { strategy: 14, loyalty: 4 },
  next: 'ch2_gen_a1_signal',
}
```

### `set_flag`

Sets a plot flag and immediately advances.

```js
ch2_gen_end: {
  type: 'set_flag',
  flag: 'ch2_talked_gen',
  value: true,
  next: 'ch2_check',
}
```

### `condition`

Selects a route based on flags, scores, story mode, and nested boolean logic.

```js
ch2_check: {
  type: 'condition',
  conditions: [
    {
      minMode: 'free',
      hasFlags: ['ch2_talked_gen', 'ch2_talked_junot', 'ch2_signal_harbor'],
      minScores: { strategy: 20 },
      next: 'ch2_harbor_signal_event',
    },
    {
      minMode: 'guided',
      hasFlags: ['ch2_talked_gen', 'ch2_talked_junot'],
      next: 'ch2_battle_event',
    },
  ],
  defaultNext: 'ch2_start',
}
```

Supported gates:

- `mode`, `storyModes`, `minMode`, `maxMode`
- `hasFlags`, `anyFlags`, `lacksFlags`, `unlessFlags`
- `flagValues`
- `minScores`, `maxScores`
- `allOf`, `anyOf`, `not`

### `event`

Triggers a 3D scene/audio event, then advances. If `delay` is set, the engine waits before advancing.

```js
ch2_battle_event: {
  type: 'event',
  eventName: 'artillery_fire',
  delay: 2000,
  next: 'ch2_end',
}
```

The active scene may implement `handleEvent(eventName)` to render visual feedback.

### `chapter_end`

Ends the chapter. `nextChapter` is a zero-based chapter index. Because this value is data-driven, a route can send the player to different later scenes.

```js
ch2_end: {
  type: 'chapter_end',
  nextChapter: 2,
}
```

## Campaign Depth Modes

New games can choose one of three modes:

- `essential`: only critical-path interactions are active.
- `guided`: main story plus curated branch content. This is the default.
- `free`: widest branch set, including optional or condition-gated choices.

Use `minMode` and `maxMode` on interactions, choices, or condition routes. For example, a side NPC can be hidden in Essential Campaign with `minMode: 'guided'`, while a high-consequence optional choice can require `minMode: 'free'`.

## Authoring Rules

1. Keep the engine generic. Add new story complexity as graph data first.
2. Add scene code only for reusable visual events, new environments, or new NPC placements.
3. Keep every loop safe. A `condition` node should have a `defaultNext` that returns to an `explore` node or another valid recovery path.
4. Add matching English and Simplified Chinese translation keys for every new `speakerKey`, `textKey`, and `choice.textKey`.
5. Add tests when a branch uses score gates, story-mode gates, nested conditions, or non-linear chapter routing.
