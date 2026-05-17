/**
 * DialogueSystem - 对话系统
 * 管理对话流、选项分支、历史记录
 */
import { gameState } from '../core/GameState.js';

export class DialogueSystem {
  constructor(uiElements) {
    this.box = uiElements.box;
    this.speakerEl = uiElements.speaker;
    this.textEl = uiElements.text;
    this.choicesEl = uiElements.choices;
    this.portraitCanvas = uiElements.portrait;
    this.skipHint = uiElements.skipHint;

    this.currentNode = null;
    this.isTyping = false;
    this.typeInterval = null;
    this.fullText = '';
    this.onComplete = null;
    this.chapterIndex = 0;
    this.chapterId = '';

    this._bindEvents();
  }

  _bindEvents() {
    this.box.addEventListener('click', () => {
      if (this.isTyping) {
        this._finishTyping();
      } else if (this.currentNode && (!this.currentNode.choices || this.currentNode.choices.length === 0)) {
        if (this.onAction) this.onAction('next');
      }
    });
  }

  showNode(node, onAction) {
    this.box.classList.remove('hidden');
    this.currentNode = node;
    this.onAction = onAction;

    this.choicesEl.classList.add('hidden');
    this.choicesEl.innerHTML = '';
    
    // 说话人名字
    this.speakerEl.textContent = node.speaker || '';

    // 绘制头像
    this._drawPortrait(node.speaker, node.portraitColor);

    // 打字机效果
    this._typeText(node.text);
  }

  hide() {
    this.box.classList.add('hidden');
    this.choicesEl.classList.add('hidden');
    if (this.typeInterval) clearInterval(this.typeInterval);
    this.currentNode = null;
  }

  _typeText(text) {
    this.fullText = text;
    this.textEl.textContent = '';
    this.isTyping = true;
    this.skipHint && (this.skipHint.style.opacity = '0');
    let i = 0;
    if (this.typeInterval) clearInterval(this.typeInterval);
    this.typeInterval = setInterval(() => {
      this.textEl.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(this.typeInterval);
        this.typeInterval = null;
        this.isTyping = false;
        this._onTextComplete();
      }
    }, 35);
  }

  _finishTyping() {
    if (this.typeInterval) clearInterval(this.typeInterval);
    this.typeInterval = null;
    this.textEl.textContent = this.fullText;
    this.isTyping = false;
    this._onTextComplete();
  }

  _onTextComplete() {
    if (this.skipHint) this.skipHint.style.opacity = '1';
    if (this.currentNode.choices && this.currentNode.choices.length > 0) {
      this._showChoices(this.currentNode.choices);
    }
  }

  _showChoices(choices) {
    this.choicesEl.innerHTML = '';
    this.choicesEl.classList.remove('hidden');
    if (this.skipHint) this.skipHint.style.display = 'none';

    const letters = ['A', 'B', 'C', 'D'];
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="choice-letter">${letters[i]}</span> ${choice.text}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectChoice(choice, i);
      });
      this.choicesEl.appendChild(btn);
    });
  }

  _selectChoice(choice, index) {
    this.choicesEl.classList.add('hidden');
    if (this.skipHint) this.skipHint.style.display = '';
    if (this.onAction) this.onAction('choice', index);
  }

  /**
   * 在canvas上绘制角色头像
   */
  _drawPortrait(speaker, color = '#c9a84c') {
    const canvas = this.portraitCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 背景
    const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    bg.addColorStop(0, '#1a2f45');
    bg.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 人物简笔轮廓
    ctx.fillStyle = color || '#c9a84c';
    // 头
    ctx.beginPath();
    ctx.arc(w/2, h * 0.38, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // 身体
    ctx.fillRect(w/2 - h*0.15, h*0.58, h*0.3, h*0.35);

    // 名字首字母
    const initial = (speaker || '?')[0].toUpperCase();
    ctx.fillStyle = '#0d1b2a';
    ctx.font = `bold ${h * 0.22}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, w/2, h * 0.38);
  }
}
