import { DialogueEngine } from '../systems/dialogue.js';
import { Events } from '../core/events.js';
import { typewriterEffect } from '../utils/helpers.js';

export class DialogBox {
  constructor() {
    this.isTyping = false;
    this.overlay = null;
    this.container = null;
  }

  async show(npcId) {
    var node = DialogueEngine.startDialogue(npcId);
    if (!node) return;
    
    // Создаём оверлей
    this._createOverlay();
    await this.render(node);
  }

  _createOverlay() {
    // Удаляем старый если есть
    this.close();
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    this.overlay.innerHTML = '<div class="dialog-modal" id="dialog-modal"></div>';
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
    var trustEmoji = this._getTrustEmoji(node.trust);
    var trustColor = this._getTrustColor(node.trust);
    var typeLabel = this._getTypeLabel(node.type);

    this.container.innerHTML = `
      <div class="dialog-content">
        <!-- Заголовок -->
        <div class="dialog-header">
          <div class="dialog-avatar">${node.speaker.charAt(0)}</div>
          <div class="dialog-speaker-info">
            <p class="dialog-speaker-name">${node.speaker}</p>
            <p class="dialog-speaker-role">${node.speakerRole}</p>
          </div>
          <div class="dialog-trust ${trustColor}">
            <span>${trustEmoji} ${node.trust}%</span>
          </div>
        </div>

        <!-- Тип сообщения -->
        ${typeLabel ? '<p class="dialog-type-label">' + typeLabel + '</p>' : ''}

        <!-- Текст -->
        <div class="dialog-text" id="dialog-text"></div>

        <!-- Выборы -->
        <div class="dialog-choices" id="dialog-choices"></div>
      </div>
    `;

    // Печатаем текст
    var textEl = this.container.querySelector('#dialog-text');
    this.isTyping = true;
    await typewriterEffect(textEl, node.text, 25);
    this.isTyping = false;

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
          btn.innerHTML = '<span class="tone-icon">' + self._getToneIcon(choice.tone) + '</span> ' + choice.text;
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
          btnTopic.textContent = '📋 ' + topic.label;
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
          btnQ.textContent = '❓ ' + q.text;
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
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      var self = this;
      setTimeout(function() {
        if (self.overlay) self.overlay.remove();
        self.overlay = null;
        self.container = null;
      }, 300);
    }
    Events.emit('dialogue:closed');
  }

  _getTrustEmoji(trust) {
    if (trust >= 70) return '😊';
    if (trust >= 40) return '😐';
    if (trust >= 20) return '😒';
    return '😠';
  }

  _getTrustColor(trust) {
    if (trust >= 70) return 'trust-high';
    if (trust >= 40) return 'trust-mid';
    if (trust >= 20) return 'trust-low';
    return 'trust-bad';
  }

  _getToneIcon(tone) {
    var icons = { kind: '😇', aggressive: '😠', logical: '🧠', sarcastic: '😏', neutral: '💬' };
    return icons[tone] || '💬';
  }
}