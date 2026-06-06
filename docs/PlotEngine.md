# PlotEngine 剧情引擎使用指南

`PlotEngine` 是游戏的核心剧情执行引擎。它将游戏的剧情从 `GameEngine` 和各个 3D 场景类中剥离，转变为纯粹的数据驱动 (Data-Driven) 模式。

所有的剧情结构都存放在 `src/data/plotData.js` 文件中。设计人员只需要编写和修改这个文件里的数据节点（Node），就可以创造出复杂的网状剧情结构。

实际显示给玩家的文本存放在 `src/i18n/locales/*.js`。剧情节点只保存 `speakerKey`、`textKey` 和 `choice.textKey`，由 `PlotEngine` 在运行时本地化。默认语言是英文。

## 核心概念

剧情是由一个个相互连接的**节点 (Node)** 构成的图结构。引擎同一时刻只会停留在某个节点上执行对应的行为。行为执行完毕后，引擎会根据节点中的 `next` 或玩家的 `choice`，跳转到下一个节点。

## 节点类型说明

目前支持以下 6 种类型的节点，通过 `type` 字段区分：

### 1. 探索节点 (`explore`)
让游戏进入 3D 探索模式，允许玩家控制角色移动。当玩家靠近特定 NPC 并按下交互键时，跳转到对应的对话节点。
```javascript
"ch2_start": {
  type: "explore",
  interactions: {
    "general": "ch2_gen_start", // 交互对应 NPC ID 时，跳转的目标节点
    "junot": "ch2_junot_start"
  }
}
```

### 2. 对话节点 (`dialog`)
弹出 UI 对话框。可以只包含文本（点击后进入下一节点），也可以包含选项（点击选项后跳转到对应节点并结算数值影响）。
```javascript
"ch2_gen_q1": {
  type: "dialog", 
  speakerKey: "characters.napoleon", 
  portraitColor: "#1a3a5c", 
  textKey: "plot.ch2.general.q1",
  choices: [
    { textKey: "plot.ch2.general.choices.force", impact: { strategy: 12 }, next: "ch2_gen_a1_force" },
    { textKey: "plot.ch2.general.choices.flank", impact: { humanity: 10 }, next: "ch2_gen_a1_flank" }
  ]
}
```

### 3. 设置标记 (`set_flag`)
用于记录玩家的足迹，比如记录玩家是否已经和某人说过话。这对控制剧情进度至关重要。
```javascript
"ch2_gen_end": { 
  type: "set_flag", 
  flag: "talked_gen", // 标记名称
  value: true,        // 赋予的值
  next: "ch2_check"   // 执行完毕后立刻跳转
}
```

### 4. 条件判断 (`condition`)
根据当前的剧情标记，决定接下来的路线（If-Else 结构）。
```javascript
"ch2_check": {
  type: "condition",
  conditions: [
    // 如果下面这两个 Flag 都为 true，则跳转到 ch2_battle_event
    { hasFlags: ["talked_gen", "talked_junot"], next: "ch2_battle_event" }
  ],
  defaultNext: "ch2_start" // 如果都不满足，默认跳转回探索模式
}
```

### 5. 场景事件 (`event`)
触发 3D 场景中的特殊效果（例如炮击、震屏、增援出现）。
触发事件后，会自动调用对应章节 `ChapterXScene.js` 里的 `handleEvent(eventName)` 函数。
```javascript
"ch2_battle_event": { 
  type: "event", 
  eventName: "artillery_fire", 
  next: "ch2_end" 
}
```

### 6. 章节结束 (`chapter_end`)
告诉主引擎本章节的剧情网络已到达终点，可以播放章节结算动画，并准备加载下一个 3D 场景了。
```javascript
"ch2_end": { 
  type: "chapter_end", 
  nextChapter: 2 // 接下来要跳转的章节 index
}
```

## 设计与调试建议

1. **闭环设计**：当你设计一个循环时（例如和多个NPC说话才能触发后续），确保 `defaultNext` 总是能安全地回到一个 `explore` 节点，否则游戏会卡死。
2. **唯一命名**：给每个节点一个具有描述性的全局唯一 ID，建议带上章节前缀（例如 `ch3_start`, `ch3_npc_talk`）。
3. **文本资源**：新增剧情时，同步补齐 `src/i18n/locales/en.js` 和 `src/i18n/locales/zh-CN.js` 的翻译 key。
4. **单元测试**：如果你添加了复杂的网状循环结构，可以在 `src/tests/game.test.js` 中添加针对你这个新剧情片段的逻辑连通性测试。
