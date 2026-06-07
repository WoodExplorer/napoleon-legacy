import { translateNode } from '../i18n/index.js';
import { isStoryModeAllowed } from './StoryMode.js';

export class PlotEngine {
  constructor(plotData, gameState, localizeNode = translateNode) {
    this.plotData = plotData;
    this.gameState = gameState;
    this.localizeNode = localizeNode;
    this.currentNodeId = null;

    // Callbacks to hook into the game UI and 3D engine
    this.onEnterExplore = null; // (node) => void
    this.onShowDialog = null;   // (node) => void
    this.onTriggerEvent = null; // (eventName) => void
    this.onChapterEnd = null;   // (nextChapterIndex) => void
  }

  start(nodeId) {
    this.currentNodeId = nodeId;
    this._executeNode();
  }

  _executeNode() {
    const rawNode = this.plotData[this.currentNodeId];
    const preparedNode = this._prepareNode(rawNode);
    const node = this.localizeNode(preparedNode);
    if (!node) {
      console.warn(`Node ${this.currentNodeId} not found!`);
      return;
    }

    switch (node.type) {
      case 'explore':
        if (this.onEnterExplore) this.onEnterExplore(node);
        break;
      case 'dialog':
        if (this.onShowDialog) this.onShowDialog(node);
        break;
      case 'event':
        if (this.onTriggerEvent) this.onTriggerEvent(node.eventName);
        if (node.delay) {
          setTimeout(() => this.advance(this._resolveNext(node.next)), node.delay);
        } else {
          this.advance(this._resolveNext(node.next));
        }
        break;
      case 'condition':
        let nextNode = node.defaultNext;
        for (const cond of node.conditions || []) {
           if (this._evalCond(cond)) {
              nextNode = cond.next;
              break;
           }
        }
        this.advance(nextNode);
        break;
      case 'set_flag':
        this.gameState.setFlag(node.flag, node.value);
        this.advance(this._resolveNext(node.next));
        break;
      case 'chapter_end':
        if (this.onChapterEnd) this.onChapterEnd(node.nextChapter);
        break;
    }
  }

  _prepareNode(rawNode) {
    if (!rawNode) return rawNode;
    const node = { ...rawNode, id: this.currentNodeId };
    if (node.choices) {
      node.choices = node.choices.filter(choice => this._evalCond(choice));
    }
    if (node.type === 'explore' && node.interactions) {
      node.interactions = this._getAvailableInteractions(node.interactions);
    }
    return node;
  }

  _getStoryMode() {
    return this.gameState?.getStoryMode?.() || this.gameState?.storyMode;
  }

  _getScore(key) {
    return this.gameState?.scores?.[key] ?? 0;
  }

  _evalCond(cond) {
    if (!cond) return true;
    if (!isStoryModeAllowed(this._getStoryMode(), cond)) return false;
    if (cond.allOf && !cond.allOf.every(child => this._evalCond(child))) return false;
    if (cond.anyOf && !cond.anyOf.some(child => this._evalCond(child))) return false;
    if (cond.not && this._evalCond(cond.not)) return false;
    if (cond.hasFlags) {
       if (!cond.hasFlags.every(f => this.gameState.getFlag(f))) return false;
    }
    if (cond.anyFlags) {
      if (!cond.anyFlags.some(f => this.gameState.getFlag(f))) return false;
    }
    const absentFlags = cond.lacksFlags || cond.unlessFlags;
    if (absentFlags) {
      if (!absentFlags.every(f => !this.gameState.getFlag(f))) return false;
    }
    if (cond.flagValues) {
      const matches = Object.entries(cond.flagValues)
        .every(([flag, value]) => this.gameState.getFlag(flag) === value);
      if (!matches) return false;
    }
    if (cond.minScores) {
      const matches = Object.entries(cond.minScores)
        .every(([score, value]) => this._getScore(score) >= value);
      if (!matches) return false;
    }
    if (cond.maxScores) {
      const matches = Object.entries(cond.maxScores)
        .every(([score, value]) => this._getScore(score) <= value);
      if (!matches) return false;
    }
    return true;
  }

  advance(nextNodeId) {
    const resolvedNext = this._resolveNext(nextNodeId);
    if (resolvedNext) {
      this.currentNodeId = resolvedNext;
      this._executeNode();
    } else {
      console.warn('advance() called with no nextNodeId');
    }
  }

  _resolveNext(next) {
    if (!next || typeof next === 'string') return next;
    if (Array.isArray(next)) {
      const route = next.find(candidate => this._evalCond(candidate));
      return route?.next || null;
    }
    if (typeof next === 'object') {
      if (this._evalCond(next)) return next.next;
      return next.defaultNext || null;
    }
    return null;
  }

  applyChoiceEffects(choice) {
    if (!choice) return;
    if (choice.setFlags && typeof choice.setFlags === 'object') {
      if (Array.isArray(choice.setFlags)) {
        choice.setFlags.forEach(({ flag, value = true }) => this.gameState.setFlag(flag, value));
      } else {
        Object.entries(choice.setFlags).forEach(([flag, value]) => this.gameState.setFlag(flag, value));
      }
    }
    if (choice.unsetFlags) {
      choice.unsetFlags.forEach(flag => this.gameState.setFlag(flag, false));
    }
  }

  _getAvailableInteractions(interactions) {
    return Object.fromEntries(
      Object.entries(interactions)
        .filter(([, target]) => typeof target === 'string' || this._evalCond(target))
    );
  }

  _getInteractionNext(target) {
    if (typeof target === 'string') return target;
    if (target && typeof target === 'object' && this._evalCond(target)) return target.next;
    return null;
  }

  getActiveInteractionIds() {
    const node = this.plotData[this.currentNodeId];
    if (!node || node.type !== 'explore' || !node.interactions) return null;
    return Object.keys(this._getAvailableInteractions(node.interactions));
  }

  handleInteract(npcId) {
    const node = this.plotData[this.currentNodeId];
    const target = node?.type === 'explore' ? node.interactions?.[npcId] : null;
    const next = this._getInteractionNext(target);
    if (next) {
      this.advance(next);
      return true; // handled
    }
    return false; // not handled
  }
}
