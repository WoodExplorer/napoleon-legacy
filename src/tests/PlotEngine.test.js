import { describe, it, expect, vi } from 'vitest';
import { PlotEngine } from '../core/PlotEngine.js';

describe('PlotEngine', () => {
  it('should initialize and execute explore node', () => {
    const plotData = {
      start: { type: 'explore' }
    };
    const gameState = { setFlag: vi.fn(), getFlag: vi.fn() };
    const engine = new PlotEngine(plotData, gameState);
    engine.onEnterExplore = vi.fn();
    
    engine.start('start');
    expect(engine.currentNodeId).toBe('start');
    expect(engine.onEnterExplore).toHaveBeenCalledWith(plotData.start);
  });

  it('should handle dialog sequence and choices', () => {
    const plotData = {
      start: { type: 'dialog', next: 'q1' },
      q1: { type: 'dialog', choices: [{ next: 'end' }] },
      end: { type: 'chapter_end', nextChapter: 2 }
    };
    const gameState = { setFlag: vi.fn(), getFlag: vi.fn() };
    const engine = new PlotEngine(plotData, gameState);
    
    engine.onShowDialog = vi.fn();
    engine.onChapterEnd = vi.fn();
    
    engine.start('start');
    expect(engine.onShowDialog).toHaveBeenCalledWith(plotData.start);
    
    engine.advance(plotData.start.next);
    expect(engine.currentNodeId).toBe('q1');
    
    engine.advance(plotData.q1.choices[0].next);
    expect(engine.onChapterEnd).toHaveBeenCalledWith(2);
  });

  it('should evaluate conditions and set flags', () => {
    const plotData = {
      start: { type: 'set_flag', flag: 'met_npc', value: true, next: 'check' },
      check: {
        type: 'condition',
        conditions: [
          { hasFlags: ['met_npc'], next: 'success' }
        ],
        defaultNext: 'fail'
      },
      success: { type: 'event', eventName: 'win', next: 'end' },
      fail: { type: 'explore' },
      end: { type: 'chapter_end' }
    };
    
    const flags = {};
    const gameState = {
      setFlag: (k, v) => { flags[k] = v; },
      getFlag: (k) => flags[k]
    };
    
    const engine = new PlotEngine(plotData, gameState);
    engine.onTriggerEvent = vi.fn();
    
    engine.start('start');
    expect(flags['met_npc']).toBe(true);
    expect(engine.onTriggerEvent).toHaveBeenCalledWith('win');
  });

  it('should handle interact to transition from explore to dialog', () => {
    const plotData = {
      explore1: { type: 'explore', interactions: { 'npc1': 'dialog1' } },
      dialog1: { type: 'dialog', next: 'end' }
    };
    const engine = new PlotEngine(plotData, {});
    engine.onShowDialog = vi.fn();
    
    engine.start('explore1');
    const handled = engine.handleInteract('npc1');
    expect(handled).toBe(true);
    expect(engine.currentNodeId).toBe('dialog1');
    expect(engine.onShowDialog).toHaveBeenCalledWith(plotData.dialog1);
  });
});
