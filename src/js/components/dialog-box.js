import { DialogueEngine } from '../systems/dialogue.js';
import { Events } from '../core/events.js';
import { escapeHtml } from '../utils/helpers.js';

const CHARACTER_PORTRAITS = Object.freeze({
  'Доктор Лидия Винтер': 'lydia-winter.webp',
  'Детектив Рэй Морган': 'ray-morgan.webp',
  'Анна Холт': 'anna-holt.webp',
  'Марта Хейз': 'marta-hayes.webp',
  'Отец Томас': 'father-thomas.webp',
  'Себастьян Блэквуд': 'sebastian-blackwood.webp'
});

const CHARACTER_REACTION_PORTRAITS = Object.freeze({
  'Доктор Лидия Винтер': Object.freeze({
    tension: 'lydia-winter-tension.webp',
    warmth: 'lydia-winter-warmth.webp',
    withdrawal: 'lydia-winter-withdrawal.webp'
  }),
  'Детектив Рэй Морган': Object.freeze({
    tension: 'ray-morgan-tension.webp',
    warmth: 'ray-morgan-warmth.webp',
    withdrawal: 'ray-morgan-withdrawal.webp'
  }),
  'Анна Холт': Object.freeze({
    tension: 'anna-holt-tension.webp',
    warmth: 'anna-holt-warmth.webp'
  })
});

export function resolvePortraitFile(speaker, reaction = 'neutral') {
  return CHARACTER_REACTION_PORTRAITS[speaker]?.[reaction] || CHARACTER_PORTRAITS[speaker] || null;
}

export class DialogBox {
  constructor() {
    this.isTyping = false;
    this.overlay = null;
    this.container = null;
    this.renderToken = 0;
    this.skipTyping = false;
  }

  async show(npcId) {
    var node = DialogueEngine.startDialogue(npcId);
    if (!node) return;

    // Создаём оверлей
    this._createOverlay();
    await this.render(node);
  }

  _createOverlay() {
    // Удаляем старый слой без ложного события завершения беседы.
    if (this.overlay) this.overlay.remove();

    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay cinematic-dialog-overlay';
    this.overlay.innerHTML = '<div class="dialog-modal cinematic-dialog" id="dialog-modal" role="dialog" aria-modal="true" aria-label="Разговор с персонажем"></div>';
    document.body.appendChild(this.overlay);

    this.container = this.overlay.querySelector('#dialog-modal');

    // Закрытие по клику на фон (только если диалог завершён)
    var self = this;
    this.overlay.addEventListener('click', function(e) {
      if (e.target === self.overlay && !self.isTyping) {
        // Не закрываем по фону во время диалога
      }
    });
  }

  async render(node) {
    var self = this;
    const token = ++this.renderToken;
    this.skipTyping = false;
    var trustEmoji = this._getTrustEmoji(node.trust);
    var trustColor = this._getTrustColor(node.trust);
    var typeLabel = this._getTypeLabel(node.type);
    const reaction = ['tension', 'warmth', 'withdrawal'].includes(node.reaction)
      ? node.reaction : 'neutral';
    const portraitFile = resolvePortraitFile(node.speaker, reaction);
    const portrait = portraitFile
      ? `<img class="portrait-image" src="src/assets/portraits/${portraitFile}" alt="" loading="eager">`
      : `<span class="portrait-silhouette"></span><span class="portrait-initial">${escapeHtml(node.speaker.charAt(0))}</span>`;

    this.container.classList.toggle('dialog-critical', node.type === 'critical_choice' || node.type === 'critical_result');
    for (const state of ['tension', 'warmth', 'withdrawal']) {
      this.container.classList.toggle(`dialog-reaction-${state}`, reaction === state);
    }
    this.container.innerHTML = `
      <div class="dialog-content cinematic-dialog-content">
        <div class="cinematic-dialog-overline"><span>BLACKFORD · ЗАПИСЬ БЕСЕДЫ</span><span>ДЕЛО 001</span></div>
        <!-- Заголовок -->
        <div class="dialog-header">
          <div class="dialog-avatar cinematic-portrait" aria-hidden="true">${portrait}</div>
          <div class="dialog-speaker-info">
            <p class="dialog-speaker-name">${escapeHtml(node.speaker)}</p>
            <p class="dialog-speaker-role">${escapeHtml(node.speakerRole)}</p>
          </div>
          <div class="dialog-trust ${trustColor}">
            <span>${trustEmoji} ДОВЕРИЕ · ${node.trust}%</span>
          </div>
        </div>

        <!-- Тип сообщения -->
        ${typeLabel ? '<p class="dialog-type-label">' + typeLabel + '</p>' : ''}

        <!-- Текст -->
        <div class="dialog-text" id="dialog-text" aria-live="polite"></div>
        <button class="dialog-skip" type="button" id="dialog-skip" aria-label="Показать реплику полностью">Показать текст целиком ↳</button>

        <!-- Выборы -->
        <div class="dialog-choices" id="dialog-choices"></div>
      </div>
    `;

    // Печатаем текст
    var textEl = this.container.querySelector('#dialog-text');
    const skipButton = this.container.querySelector('#dialog-skip');
    skipButton.addEventListener('click', () => { this.skipTyping = true; });
    this.isTyping = true;
    textEl.textContent = '';
    const fullText = String(node.text || '');
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      textEl.textContent = fullText;
    } else {
      for (let i = 0; i < fullText.length; i++) {
        if (token !== this.renderToken || !textEl.isConnected) return;
        if (this.skipTyping) {
          textEl.textContent = fullText;
          break;
        }
        textEl.textContent += fullText[i];
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    if (token !== this.renderToken || !this.container) return;
    this.isTyping = false;
    skipButton.hidden = true;

    // Рендерим кнопки
    var choicesEl = this.container.querySelector('#dialog-choices');
    this._renderChoices(node, choicesEl);
  }

  _getTypeLabel(type) {
    var labels = {
      'narrative': '',
      'first_meeting': '',
      'topic_selection': 'ВЫБЕРИТЕ ТЕМУ',
      'topic_questions': 'ЗАДАЙТЕ ВОПРОС',
      'answer': '',
      'critical_choice': '⚠ РЕШАЮЩИЙ ВЫБОР',
      'critical_result': '',
      'simple': ''
    };
    return labels[type] || '';
  }

  _renderChoices(node, choicesEl) {
    var self = this;
    choicesEl.innerHTML = '';

    // КРИТИЧЕСКИЙ ВЫБОР
    if (node.type === 'critical_choice') {
      choicesEl.innerHTML = '<p class="critical-warning">Этот выбор изменит отношение персонажа к вам навсегда</p>';

      if (node.choices) {
        node.choices.forEach(function(choice) {
          var btn = document.createElement('button');
          btn.className = 'dialog-btn critical-btn';
          btn.innerHTML = '<span class="tone-icon">' + self._getToneIcon(choice.tone) + '</span> ' + escapeHtml(choice.text);
          btn.addEventListener('click', async function() {
            var nextNode = DialogueEngine.makeCriticalChoice(choice.id);
            if (nextNode) await self.render(nextNode);
            else self.close();
          });
          choicesEl.appendChild(btn);
        });
      }
      return;
    }

    // РЕЗУЛЬТАТ КРИТИЧЕСКОГО ВЫБОРА
    if (node.type === 'critical_result') {
      if (node.addedNote) {
        var noteEl = document.createElement('p');
        noteEl.className = 'note-added';
        noteEl.textContent = '📝 В заметки: ' + node.addedNote.title;
        choicesEl.appendChild(noteEl);
      }
      var btn = document.createElement('button');
      btn.className = 'dialog-btn primary-btn';
      btn.textContent = node.isEnd ? 'ЗАКОНЧИТЬ РАЗГОВОР' : 'ПРОДОЛЖИТЬ';
      btn.addEventListener('click', async function() {
        if (node.isEnd) {
          self.close();
        } else {
          var nextNode = DialogueEngine.backToTopics();
          if (nextNode) await self.render(nextNode);
          else self.close();
        }
      });
      choicesEl.appendChild(btn);
      return;
    }

    // ПЕРВАЯ ВСТРЕЧА
    if (node.type === 'first_meeting') {
      var btnFirst = document.createElement('button');
      btnFirst.className = 'dialog-btn primary-btn';
      btnFirst.textContent = 'ПРОДОЛЖИТЬ';
      btnFirst.addEventListener('click', async function() {
        var nextNode = DialogueEngine.backToTopics();
        if (nextNode) await self.render(nextNode);
        else self.close();
      });
      choicesEl.appendChild(btnFirst);
      return;
    }

    // ВЫБОР ТЕМЫ
    if (node.type === 'topic_selection') {
      if (node.topics && node.topics.length > 0) {
        node.topics.forEach(function(topic) {
          var btnTopic = document.createElement('button');
          btnTopic.className = 'dialog-btn topic-btn';
          btnTopic.textContent = '▤ ' + topic.label;
          btnTopic.addEventListener('click', async function() {
            var nextNode = DialogueEngine.selectTopic(topic.id);
            if (nextNode) await self.render(nextNode);
          });
          choicesEl.appendChild(btnTopic);
        });
      }
      if (node.canLeave) {
        var leaveBtn = document.createElement('button');
        leaveBtn.className = 'dialog-btn leave-btn';
        leaveBtn.textContent = 'Закончить разговор';
        leaveBtn.addEventListener('click', function() { self.close(); });
        choicesEl.appendChild(leaveBtn);
      }
      return;
    }

    // ВОПРОСЫ В ТЕМЕ
    if (node.type === 'topic_questions') {
      if (node.questions && node.questions.length > 0) {
        node.questions.forEach(function(q) {
          var btnQ = document.createElement('button');
          btnQ.className = 'dialog-btn question-btn';
          btnQ.textContent = '◇ ' + q.text;
          btnQ.addEventListener('click', async function() {
            var nextNode = DialogueEngine.askQuestion(q.id);
            if (nextNode) await self.render(nextNode);
          });
          choicesEl.appendChild(btnQ);
        });
      }
      if (node.canGoBack) {
        var backBtn = document.createElement('button');
        backBtn.className = 'dialog-btn back-btn';
        backBtn.textContent = '← Назад к темам';
        backBtn.addEventListener('click', async function() {
          var nextNode = DialogueEngine.backToTopics();
          if (nextNode) await self.render(nextNode);
        });
        choicesEl.appendChild(backBtn);
      }
      return;
    }

    // ОТВЕТ
    if (node.type === 'answer') {
      if (node.addedNote) {
        var noteEl2 = document.createElement('p');
        noteEl2.className = 'note-added';
        noteEl2.textContent = '📝 В заметки: ' + node.addedNote.title;
        choicesEl.appendChild(noteEl2);
      }
      var continueBtn = document.createElement('button');
      continueBtn.className = 'dialog-btn primary-btn';
      continueBtn.textContent = 'ПРОДОЛЖИТЬ';
      continueBtn.addEventListener('click', async function() {
        var nextNode = DialogueEngine.backToTopics();
        if (nextNode) await self.render(nextNode);
        else self.close();
      });
      choicesEl.appendChild(continueBtn);
      return;
    }

    // ПРОСТОЙ УЗЕЛ
    if (node.type === 'simple') {
      var simpleBtn = document.createElement('button');
      simpleBtn.className = 'dialog-btn primary-btn';
      simpleBtn.textContent = 'ЗАКОНЧИТЬ';
      simpleBtn.addEventListener('click', function() { self.close(); });
      choicesEl.appendChild(simpleBtn);
    }
  }

  close() {
    this.renderToken++;
    this.isTyping = false;
    this.skipTyping = false;
    if (this.overlay) {
      const closingOverlay = this.overlay;
      closingOverlay.style.opacity = '0';
      this.overlay = null;
      this.container = null;
      setTimeout(function() {
        closingOverlay.remove();
      }, 300);
      Events.emit('dialogue:closed');
    }
  }

  _getTrustEmoji(trust) {
    if (trust >= 70) return '◆';
    if (trust >= 40) return '◇';
    if (trust >= 20) return '△';
    return '✕';
  }

  _getTrustColor(trust) {
    if (trust >= 70) return 'trust-high';
    if (trust >= 40) return 'trust-mid';
    if (trust >= 20) return 'trust-low';
    return 'trust-bad';
  }

  _getToneIcon(tone) {
    var icons = { kind: '♡', aggressive: '!', logical: '◇', sarcastic: '≈', neutral: '•' };
    return icons[tone] || '•';
  }
}
