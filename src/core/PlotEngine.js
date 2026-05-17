export class PlotEngine {
  constructor(plotData, gameState) {
    this.plotData = plotData;
    this.gameState = gameState;
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
    const node = this.plotData[this.currentNodeId];
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
        this.advance(node.next);
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
        this.advance(node.next);
        break;
      case 'chapter_end':
        if (this.onChapterEnd) this.onChapterEnd(node.nextChapter);
        break;
    }
  }

  _evalCond(cond) {
    if (cond.hasFlags) {
       return cond.hasFlags.every(f => this.gameState.getFlag(f));
    }
    return false;
  }

  advance(nextNodeId) {
    if (nextNodeId) {
      this.currentNodeId = nextNodeId;
      this._executeNode();
    } else {
      console.warn('advance() called with no nextNodeId');
    }
  }

  handleInteract(npcId) {
    const node = this.plotData[this.currentNodeId];
    if (node && node.type === 'explore' && node.interactions && node.interactions[npcId]) {
      this.advance(node.interactions[npcId]);
      return true; // handled
    }
    return false; // not handled
  }
}
