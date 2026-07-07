import { Timeline } from '../systems/timeline.js';
import { Events } from '../core/events.js';

/**
 * UI-компонент таймлайна.
 * Игрок перетаскивает события, чтобы восстановить хронологию.
 */
export class TimelineUI {
  constructor(container) {
    this.container = container;
    this.playerOrder = [];
    this.events = [];
    this.draggedEvent = null;
    this.isSubmitted = false;
    this.showHints = false;
  }

  render() {
    this.events = Timeline.getShuffledEvents();
    this.playerOrder = this.events.map(function(e) { return e.id; });
    this.isSubmitted = false;
    
    var self = this;

    this.container.innerHTML = `
      <div class="timeline-container">
        <div class="timeline-header">
          <p class="timeline-title">⏳ ХРОНОЛОГИЯ СОБЫТИЙ</p>
          <p class="timeline-subtitle">Расположите события в правильном порядке — от самого раннего к самому позднему</p>
        </div>

        <!-- Временная шкала -->
        <div class="timeline-track">
          <div class="timeline-line"></div>
          <div class="timeline-start">1967</div>
          <div class="timeline-end">1987</div>
          
          <div class="timeline-slots" id="timeline-slots">
            ${this.playerOrder.map(function(id, index) {
              var event = Timeline.getEventById(id);
              return `
                <div class="timeline-slot" data-position="${index}" data-event-id="${id}">
                  <span class="timeline-slot-number">${index + 1}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Карточки событий -->
        <div class="timeline-cards" id="timeline-cards">
          ${this.events.map(function(event, index) {
            return `
              <div class="timeline-card" 
                   draggable="true" 
                   data-event-id="${event.id}"
                   data-current-position="${index}">
                <span class="timeline-card-icon">${event.icon}</span>
                <div class="timeline-card-info">
                  <p class="timeline-card-title">${event.title}</p>
                  <p class="timeline-card-date">${event.year}, ${event.month}</p>
                </div>
                <span class="timeline-card-category category-${event.category}">${event.category}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Результат -->
        <div id="timeline-result" class="timeline-result hidden"></div>

        <!-- Кнопки -->
        <div class="timeline-actions">
          <button id="btn-check-timeline" class="btn-noir text-sm py-3">✅ ПРОВЕРИТЬ</button>
          <button id="btn-reset-timeline" class="btn-noir text-sm py-3 opacity-60">🔄 СБРОСИТЬ</button>
          ${this.showHints ? '' : '<button id="btn-hint-timeline" class="btn-noir text-sm py-3 opacity-60">💡 ПОДСКАЗКА</button>'}
        </div>
      </div>
    `;

    this._setupDragAndDrop();
    this._setupButtons();
    this._updateSlots();
  }

  _setupDragAndDrop() {
    var self = this;
    var cards = this.container.querySelectorAll('.timeline-card');

    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        if (self.isSubmitted) return;
        self.draggedEvent = this.getAttribute('data-event-id');
        this.classList.add('timeline-card-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', function() {
        this.classList.remove('timeline-card-dragging');
        self.draggedEvent = null;
      });
    });

    var slots = this.container.querySelectorAll('.timeline-slot');
    slots.forEach(function(slot) {
      slot.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (self.isSubmitted) return;
        this.classList.add('timeline-slot-hover');
      });

      slot.addEventListener('dragleave', function() {
        this.classList.remove('timeline-slot-hover');
      });

      slot.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('timeline-slot-hover');
        if (self.isSubmitted) return;

        var targetPosition = parseInt(this.getAttribute('data-position'));
        var draggedId = self.draggedEvent;
        var draggedPosition = self.playerOrder.indexOf(draggedId);

        if (draggedPosition !== -1 && draggedPosition !== targetPosition) {
          // Меняем местами
          self.playerOrder.splice(draggedPosition, 1);
          self.playerOrder.splice(targetPosition, 0, draggedId);
          self._updateSlots();
          self._updateCardPositions();
        }
      });
    });
  }

  _setupButtons() {
    var self = this;

    document.getElementById('btn-check-timeline').addEventListener('click', function() {
      self._checkTimeline();
    });

    document.getElementById('btn-reset-timeline').addEventListener('click', function() {
      self.render();
    });

    var hintBtn = document.getElementById('btn-hint-timeline');
    if (hintBtn) {
      hintBtn.addEventListener('click', function() {
        self.showHints = true;
        self._showHints();
      });
    }
  }

  _updateSlots() {
    var self = this;
    var slots = this.container.querySelectorAll('.timeline-slot');

    slots.forEach(function(slot) {
      var position = parseInt(slot.getAttribute('data-position'));
      var eventId = self.playerOrder[position];
      var event = Timeline.getEventById(eventId);

      if (event) {
        slot.innerHTML = `
          <span class="timeline-slot-number">${position + 1}</span>
          <span class="timeline-slot-icon">${event.icon}</span>
          <span class="timeline-slot-title">${event.title}</span>
        `;
        slot.setAttribute('data-event-id', eventId);
      }
    });
  }

  _updateCardPositions() {
    var cards = this.container.querySelectorAll('.timeline-card');
    cards.forEach(function(card) {
      var eventId = card.getAttribute('data-event-id');
      var newPosition = this.playerOrder.indexOf(eventId);
      card.setAttribute('data-current-position', newPosition);
    }.bind(this));
  }

  _checkTimeline() {
    if (this.isSubmitted) return;
    this.isSubmitted = true;

    var result = Timeline.checkOrder(this.playerOrder);
    var resultEl = document.getElementById('timeline-result');
    resultEl.classList.remove('hidden');

    if (result.isPerfect) {
      resultEl.innerHTML = `
        <div class="bg-green-900/30 border border-green-700 p-4 text-center">
          <p class="text-green-400 text-lg">✅ ИДЕАЛЬНО!</p>
          <p class="text-green-300 text-sm mt-1">Все события расположены в правильном порядке. ${result.correct}/${result.total}</p>
          <p class="text-green-200 text-xs mt-2">Вы отлично понимаете хронологию этого дела.</p>
        </div>
      `;

      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

      // Сохраняем прогресс
      Events.emit('timeline:completed', { score: result.percentage });

      // Блокируем карточки
      this.container.querySelectorAll('.timeline-card').forEach(function(card) {
        card.setAttribute('draggable', 'false');
        card.classList.add('timeline-card-locked');
      });
    } else {
      var hintsHtml = '';
      if (this.showHints && result.wrongPositions.length > 0) {
        hintsHtml = `
          <div class="mt-3 space-y-1">
            <p class="text-yellow-400 text-xs">Подсказки:</p>
            ${result.wrongPositions.map(function(w) {
              var hint = Timeline.getHintForPosition(w.position);
              return '<p class="text-yellow-300 text-xs">• Позиция ' + (w.position + 1) + ': ' + hint + '</p>';
            }).join('')}
          </div>
        `;
      }

      resultEl.innerHTML = `
        <div class="${result.percentage >= 70 ? 'bg-yellow-900/30 border-yellow-700' : 'bg-red-900/30 border-red-700'} border p-4 text-center">
          <p class="${result.percentage >= 70 ? 'text-yellow-400' : 'text-red-400'} text-lg">
            ${result.percentage >= 70 ? '👍 ХОРОШО' : '🤔 НЕ СОВСЕМ ВЕРНО'}
          </p>
          <p class="text-gray-300 text-sm mt-1">Правильно: ${result.correct}/${result.total} (${result.percentage}%)</p>
          ${hintsHtml}
          <button id="btn-retry-timeline" class="btn-noir text-xs py-2 mt-3">🔄 ПОПРОБОВАТЬ СНОВА</button>
        </div>
      `;

      document.getElementById('btn-retry-timeline').addEventListener('click', function() {
        self.isSubmitted = false;
        resultEl.classList.add('hidden');
        self.render();
      }.bind(this));
    }
  }

  _showHints() {
    var btn = document.getElementById('btn-hint-timeline');
    if (btn) btn.remove();

    // Подсвечиваем даты на карточках
    this.container.querySelectorAll('.timeline-card-date').forEach(function(dateEl) {
      dateEl.classList.add('timeline-date-visible');
    });
  }
}