import { GameState } from '../core/state.js';
import { Investigation } from '../systems/investigation.js';
import { Events } from '../core/events.js';

/**
 * Доска расследования.
 * Игрок может перетаскивать улики и соединять их.
 */
export class InvestigationBoard {
  constructor(container) {
    this.container = container;
    this.selectedClue = null;
    this.connections = [];
    this.draggedClue = null;
  }

  async render() {
    await Investigation.init();
    var clues = GameState.currentCase.clues;
    this.connections = Investigation.getConnections();
    var self = this;

    if (clues.length === 0) {
      this.container.innerHTML = `
        <div class="board-empty">
          <p class="text-gray-500 text-sm">У вас пока нет улик.</p>
          <p class="text-gray-600 text-xs mt-2">Отправляйтесь на место преступления и соберите улики.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="investigation-board">
        <div class="board-header">
          <p class="board-title">📌 ДОСКА РАССЛЕДОВАНИЯ</p>
          <p class="board-subtitle">Соединяйте улики, чтобы найти связи</p>
          <p class="board-progress">Прогресс: ${Investigation.getProgress().percentage}% (${this.connections.length} связей)</p>
        </div>
        
        <div class="board-canvas" id="board-canvas">
          <!-- SVG для линий -->
          <svg class="board-lines" id="board-lines"></svg>
          
          <!-- Улики -->
          <div class="board-clues" id="board-clues">
            ${clues.map(function(clue, index) {
              return `
                <div class="board-clue-card" 
                     data-clue-id="${clue.id}" 
                     style="left: ${10 + (index % 3) * 30}%; top: ${10 + Math.floor(index / 3) * 30}%;"
                     draggable="true">
                  <span class="clue-card-icon">${self._getIcon(clue.category)}</span>
                  <span class="clue-card-name">${clue.name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="board-footer">
          <p id="board-hint" class="board-hint">Выберите две улики, чтобы проверить связь</p>
          <button id="btn-clear-selection" class="btn-noir text-xs py-2">СБРОСИТЬ ВЫБОР</button>
        </div>
      </div>
    `;

    this._setupDragAndDrop();
    this._setupClickHandlers();
    this._drawConnectionLines();
  }

  _setupClickHandlers() {
    var self = this;
    var cards = this.container.querySelectorAll('.board-clue-card');

    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var clueId = this.getAttribute('data-clue-id');
        self._onClueClick(clueId, this);
      });
    });

    document.getElementById('btn-clear-selection').addEventListener('click', function() {
      self._clearSelection();
    });
  }

  _onClueClick(clueId, element) {
    var hint = document.getElementById('board-hint');

    if (!this.selectedClue) {
      // Первый выбор
      this.selectedClue = { id: clueId, element: element };
      element.classList.add('board-clue-selected');
      hint.textContent = 'Теперь выберите вторую улику для соединения';
      hint.className = 'board-hint board-hint-active';
    } else if (this.selectedClue.id === clueId) {
      // Снятие выбора
      this._clearSelection();
      return;
    } else {
      // Второй выбор — проверяем связь
      var connection = Investigation.checkConnection(this.selectedClue.id, clueId);

      if (connection) {
        Investigation.saveConnection(connection);
        this.connections.push(connection);
        this._drawConnectionLines();
        hint.textContent = '✅ Связь найдена: ' + connection.description;
        hint.className = 'board-hint board-hint-success';
        
        // Анимация успеха
        this._flashCards(this.selectedClue.element, element);
      } else {
        hint.textContent = '❌ Эти улики не связаны напрямую. Попробуйте другую комбинацию.';
        hint.className = 'board-hint board-hint-fail';
      }

      // Сбрасываем выбор
      this.selectedClue.element.classList.remove('board-clue-selected');
      this.selectedClue = null;

      // Обновляем прогресс
      var progressEl = this.container.querySelector('.board-progress');
      if (progressEl) {
        progressEl.textContent = 'Прогресс: ' + Investigation.getProgress().percentage + '% (' + this.connections.length + ' связей)';
      }
    }
  }

  _flashCards(card1, card2) {
    card1.classList.add('board-clue-connected');
    card2.classList.add('board-clue-connected');
    setTimeout(function() {
      card1.classList.remove('board-clue-connected');
      card2.classList.remove('board-clue-connected');
    }, 1000);
  }

  _clearSelection() {
    if (this.selectedClue) {
      this.selectedClue.element.classList.remove('board-clue-selected');
      this.selectedClue = null;
    }
    var hint = document.getElementById('board-hint');
    if (hint) {
      hint.textContent = 'Выберите две улики, чтобы проверить связь';
      hint.className = 'board-hint';
    }
  }

  _setupDragAndDrop() {
    var self = this;
    var cards = this.container.querySelectorAll('.board-clue-card');

    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        self.draggedClue = this;
        this.style.opacity = '0.5';
      });

      card.addEventListener('dragend', function(e) {
        this.style.opacity = '1';
        self.draggedClue = null;
      });

      card.addEventListener('dragover', function(e) {
        e.preventDefault();
      });

      card.addEventListener('drop', function(e) {
        e.preventDefault();
        if (self.draggedClue) {
          // Поменять местами
          var tempLeft = self.draggedClue.style.left;
          var tempTop = self.draggedClue.style.top;
          self.draggedClue.style.left = this.style.left;
          self.draggedClue.style.top = this.style.top;
          this.style.left = tempLeft;
          this.style.top = tempTop;
          self._drawConnectionLines();
        }
      });
    });
  }

  _drawConnectionLines() {
    var svg = document.getElementById('board-lines');
    if (!svg) return;

    var lines = '';
    var self = this;

    this.connections.forEach(function(conn) {
      var card1 = self.container.querySelector('[data-clue-id="' + conn.clue1 + '"]');
      var card2 = self.container.querySelector('[data-clue-id="' + conn.clue2 + '"]');

      if (card1 && card2) {
        var rect1 = card1.getBoundingClientRect();
        var rect2 = card2.getBoundingClientRect();
        var boardRect = self.container.querySelector('.board-canvas').getBoundingClientRect();

        var x1 = rect1.left + rect1.width / 2 - boardRect.left;
        var y1 = rect1.top + rect1.height / 2 - boardRect.top;
        var x2 = rect2.left + rect2.width / 2 - boardRect.left;
        var y2 = rect2.top + rect2.height / 2 - boardRect.top;

        lines += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="connection-line" />';
      }
    });

    svg.innerHTML = lines;
  }

  _getIcon(category) {
    var icons = {
      document: '📄',
      observation: '👁️',
      object: '🔧',
      information: '💬',
      evidence: '🔬',
      important: '⭐'
    };
    return icons[category] || '📎';
  }
}