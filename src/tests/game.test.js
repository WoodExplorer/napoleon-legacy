/**
 * Unit Tests - 游戏核心逻辑测试
 * 使用原生断言（无需测试框架，可在Node.js直接运行）
 */

// ---- Simple Test Runner ----
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function assert(val, msg) { if (!val) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`); }

// ---- Mock GameState ----
class MockGameState {
  constructor() { this.reset(); }
  reset() {
    this.choices = [];
    this.scores = { strategy: 0, diplomacy: 0, loyalty: 0, legacy: 0, humanity: 0 };
    this.unlockedChapters = [0];
    this.ending = null;
  }
  recordChoice(chapterIndex, chapterId, nodeId, choiceText, impact) {
    this.choices.push({ chapterIndex, chapterId, nodeId, choiceText, impact });
    if (impact) {
      Object.entries(impact).forEach(([k, v]) => {
        if (this.scores[k] !== undefined)
          this.scores[k] = Math.max(0, Math.min(100, this.scores[k] + v));
      });
    }
  }
  unlockChapter(i) { if (!this.unlockedChapters.includes(i)) this.unlockedChapters.push(i); }
  getChoicesForChapter(i) { return this.choices.filter(c => c.chapterIndex === i); }
  computeEnding() {
    const avg = Object.values(this.scores).reduce((a, b) => a + b, 0) / 5;
    if (avg >= 70) this.ending = 'triumph';
    else if (avg >= 45) this.ending = 'legacy';
    else this.ending = 'tragedy';
    return this.ending;
  }
}

// ---- Tests ----
console.log('\n🎮 拿破仑传奇 - 单元测试\n');

console.log('── GameState 测试 ──');
const gs = new MockGameState();

test('初始分数应全为0', () => {
  Object.values(gs.scores).forEach(v => assertEqual(v, 0, '初始分数不为0'));
});

test('recordChoice 应正确累加分数', () => {
  gs.recordChoice(0, 'ch1', 'n1', '努力学习', { strategy: 10, legacy: 5 });
  assertEqual(gs.scores.strategy, 10, 'strategy 应为10');
  assertEqual(gs.scores.legacy, 5, 'legacy 应为5');
  assertEqual(gs.scores.diplomacy, 0, 'diplomacy 应仍为0');
});

test('分数不应超过100', () => {
  const g2 = new MockGameState();
  for (let i = 0; i < 20; i++) g2.recordChoice(0, 'x', 'y', 'z', { strategy: 10 });
  assert(g2.scores.strategy <= 100, '分数超过100');
});

test('分数不应低于0', () => {
  const g2 = new MockGameState();
  g2.recordChoice(0, 'x', 'y', 'z', { strategy: -500 });
  assert(g2.scores.strategy >= 0, '分数低于0');
});

test('getChoicesForChapter 应只返回该章节的选择', () => {
  const g2 = new MockGameState();
  g2.recordChoice(0, 'ch1', 'n1', '选A', { strategy: 5 });
  g2.recordChoice(1, 'ch2', 'n2', '选B', { diplomacy: 5 });
  g2.recordChoice(0, 'ch1', 'n3', '选C', { legacy: 5 });
  const ch0 = g2.getChoicesForChapter(0);
  assertEqual(ch0.length, 2, '第0章应有2条选择');
  const ch1 = g2.getChoicesForChapter(1);
  assertEqual(ch1.length, 1, '第1章应有1条选择');
});

test('unlockChapter 不应重复添加', () => {
  const g2 = new MockGameState();
  g2.unlockChapter(1);
  g2.unlockChapter(1);
  assertEqual(g2.unlockedChapters.length, 2, '不应重复解锁');
});

console.log('\n── 结局计算测试 ──');

test('高分应触发 triumph 结局', () => {
  const g = new MockGameState();
  Object.keys(g.scores).forEach(k => g.scores[k] = 80);
  assertEqual(g.computeEnding(), 'triumph', '高分应为triumph');
});

test('中分应触发 legacy 结局', () => {
  const g = new MockGameState();
  Object.keys(g.scores).forEach(k => g.scores[k] = 50);
  assertEqual(g.computeEnding(), 'legacy', '中分应为legacy');
});

test('低分应触发 tragedy 结局', () => {
  const g = new MockGameState();
  Object.keys(g.scores).forEach(k => g.scores[k] = 20);
  assertEqual(g.computeEnding(), 'tragedy', '低分应为tragedy');
});

test('边界值 45 分应为 legacy', () => {
  const g = new MockGameState();
  Object.keys(g.scores).forEach(k => g.scores[k] = 45);
  assertEqual(g.computeEnding(), 'legacy', '45分边界值应为legacy');
});

test('边界值 70 分应为 triumph', () => {
  const g = new MockGameState();
  Object.keys(g.scores).forEach(k => g.scores[k] = 70);
  assertEqual(g.computeEnding(), 'triumph', '70分边界值应为triumph');
});

console.log('\n── 对话节点结构测试 ──');

const mockDialogue = [
  { id: 'start', speaker: '莱蒂西亚', text: '你回来了', choices: [
    { text: '选A', impact: { strategy: 10 }, next: 'a1' },
    { text: '选B', impact: { diplomacy: 8 }, next: 'b1' },
  ]},
  { id: 'a1', speaker: '莱蒂西亚', text: '很好' },
  { id: 'b1', speaker: '莱蒂西亚', text: '明智' },
];

test('对话节点应有 id 字段', () => {
  mockDialogue.forEach(n => assert(n.id, `节点缺少id: ${JSON.stringify(n)}`));
});

test('对话节点应有 speaker 和 text', () => {
  mockDialogue.forEach(n => {
    assert(n.speaker, `节点缺少speaker`);
    assert(n.text, `节点缺少text`);
  });
});

test('选项节点的 next 引用应能在节点列表中找到', () => {
  mockDialogue.forEach(node => {
    if (node.choices) {
      node.choices.forEach(c => {
        if (c.next) {
          const found = mockDialogue.find(n => n.id === c.next);
          assert(found, `找不到节点 id="${c.next}"`);
        }
      });
    }
  });
});

test('选项的 impact 字段应只包含合法分数键', () => {
  const validKeys = ['strategy', 'diplomacy', 'loyalty', 'legacy', 'humanity'];
  mockDialogue.forEach(node => {
    if (node.choices) {
      node.choices.forEach(c => {
        if (c.impact) {
          Object.keys(c.impact).forEach(k => {
            assert(validKeys.includes(k), `非法impact键: ${k}`);
          });
        }
      });
    }
  });
});

console.log('\n── 章节数据测试 ──');

const chapters = [
  { id: 'chapter1', index: 0, title: '科西嘉岛的少年', year: '1785年', desc: '...' },
  { id: 'chapter2', index: 1, title: '土伦之战', year: '1793年', desc: '...' },
];

test('章节索引应连续', () => {
  chapters.forEach((ch, i) => assertEqual(ch.index, i, `章节${i}索引错误`));
});

test('所有章节应有完整字段', () => {
  chapters.forEach(ch => {
    assert(ch.id, '缺少id'); assert(ch.title, '缺少title');
    assert(ch.year, '缺少year'); assert(ch.desc, '缺少desc');
  });
});

// ---- PlotEngine Tests ----
console.log('\n── PlotEngine 测试 ──');

import('../core/PlotEngine.js').then(({ PlotEngine }) => {
  import('../data/plotData.js').then(({ plotData: realPlotData }) => {
    test('PlotEngine should initialize and execute explore node', () => {
    const plotData = { start: { type: 'explore' } };
    const engine = new PlotEngine(plotData, {});
    let exploreCalled = false;
    engine.onEnterExplore = (node) => { exploreCalled = true; assertEqual(node.type, 'explore'); };
    engine.start('start');
    assert(exploreCalled, 'onEnterExplore not called');
    assertEqual(engine.currentNodeId, 'start');
  });

  test('PlotEngine should handle dialog sequences and choices', () => {
    const plotData = {
      start: { type: 'dialog', next: 'q1' },
      q1: { type: 'dialog', choices: [{ next: 'end' }] },
      end: { type: 'chapter_end', nextChapter: 2 }
    };
    const engine = new PlotEngine(plotData, {});
    let dialogCount = 0;
    let endChapter = null;
    engine.onShowDialog = () => { dialogCount++; };
    engine.onChapterEnd = (ch) => { endChapter = ch; };
    
    engine.start('start');
    assertEqual(dialogCount, 1, 'first dialog not shown');
    engine.advance(plotData.start.next);
    assertEqual(dialogCount, 2, 'second dialog not shown');
    engine.advance(plotData.q1.choices[0].next);
    assertEqual(endChapter, 2, 'chapter_end not called properly');
  });

  test('PlotEngine should evaluate conditions and set flags', () => {
    const plotData = {
      start: { type: 'set_flag', flag: 'met', value: true, next: 'check' },
      check: {
        type: 'condition',
        conditions: [{ hasFlags: ['met'], next: 'success' }],
        defaultNext: 'fail'
      },
      success: { type: 'event', eventName: 'win', next: 'end' },
      fail: { type: 'explore' },
      end: { type: 'chapter_end' }
    };
    const flags = {};
    const mockState = { setFlag: (k, v) => { flags[k] = v; }, getFlag: (k) => flags[k] };
    const engine = new PlotEngine(plotData, mockState);
    let eventName = null;
    engine.onTriggerEvent = (e) => { eventName = e; };
    
    engine.start('start');
    assert(flags['met'], 'flag was not set');
    assertEqual(eventName, 'win', 'event was not triggered');
    assertEqual(engine.currentNodeId, 'end', 'did not advance to end after event');
  });

  test('PlotEngine should handle interact to transition from explore to dialog', () => {
    const plotData = {
      explore1: { type: 'explore', interactions: { 'npc1': 'dialog1' } },
      dialog1: { type: 'dialog', next: 'end' }
    };
    const engine = new PlotEngine(plotData, {});
    engine.start('explore1');
    const handled = engine.handleInteract('npc1');
    assert(handled, 'interact not handled');
    assertEqual(engine.currentNodeId, 'dialog1', 'did not transition to dialog');
  });

  test('PlotEngine event delay is respected', () => {
    const plotData = {
      start: { type: 'event', eventName: 'boom', delay: 2000, next: 'end' },
      end: { type: 'chapter_end' }
    };
    const engine = new PlotEngine(plotData, {});
    let triggeredEvent = null;
    let timeoutCb = null;
    let timeoutDelay = 0;
    
    // Mock setTimeout
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (cb, delay) => {
      timeoutCb = cb;
      timeoutDelay = delay;
    };
    
    engine.onTriggerEvent = (e) => { triggeredEvent = e; };
    engine.start('start');
    
    assertEqual(triggeredEvent, 'boom', 'event not triggered');
    assertEqual(timeoutDelay, 2000, 'delay was not 2000');
    assert(timeoutCb, 'setTimeout was not called');
    assert(engine.currentNodeId !== 'end', 'advanced prematurely before timeout');
    
    // Trigger the callback manually
    timeoutCb();
    assertEqual(engine.currentNodeId, 'end', 'did not advance after delay');
    
    // Restore
    global.setTimeout = originalSetTimeout;
  });

  test('PlotData (Chapter 1) requires talking to both mother and mentor to end chapter', () => {
    const flags = {};
    const mockState = { setFlag: (k, v) => { flags[k] = v; }, getFlag: (k) => flags[k] };
    const engine = new PlotEngine(realPlotData, mockState);
    
    let chapterEnded = false;
    engine.onChapterEnd = () => { chapterEnded = true; };
    engine.onShowDialog = () => {};
    engine.onEnterExplore = () => {};

    // 初始状态
    engine.start('ch1_start');
    
    // 模拟与母亲对话
    engine.handleInteract('mother'); // 跳转到 ch1_mother_start
    engine.advance(realPlotData['ch1_mother_start'].next); // 到达 q1
    engine.advance(realPlotData['ch1_mother_q1'].choices[0].next); // 选择选项1，到达 a1_study
    engine.advance(realPlotData['ch1_mother_a1_study'].next); // 到达 end 节点 (设置 flag)，并自动跳转验证 condition
    
    assert(flags['ch1_talked_mother'], '未正确设置母亲对话标记');
    assert(!flags['ch1_talked_mentor'], '不应设置导师对话标记');
    assert(!chapterEnded, '只和母亲对话不应结束章节');
    assertEqual(engine.currentNodeId, 'ch1_start', '未能返回探索状态');

    // 模拟与导师对话
    engine.handleInteract('mentor'); // 跳转到 ch1_mentor_start
    engine.advance(realPlotData['ch1_mentor_start'].next); // 到达 q1
    engine.advance(realPlotData['ch1_mentor_q1'].choices[0].next); // 选择选项1，到达 b1_france
    engine.advance(realPlotData['ch1_mentor_b1_france'].next); // 到达 end 节点，设置 flag，验证 condition 通过
    
    assert(flags['ch1_talked_mentor'], '未正确设置导师对话标记');
    assert(chapterEnded, '完成两人对话后应当结束章节');
  });

  // ---- Summary ----
  console.log(`\n${'─'.repeat(30)}`);
  console.log(`测试结果: ${passed} 通过 / ${failed} 失败`);
  if (failed === 0) console.log('🎉 所有测试通过！\n');
  else { console.log(`⚠️  ${failed} 个测试失败\n`); process.exit(1); }
  });
});
