import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

/**
 * Компонент инвентаря.
 * Показывает все собранные улики в боковой панели.
 */
export class Inventory {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.selectedClue = null;
  }

  render() {
    var clues = GameState.currentCase.clues;
    var self = this;

    this.container.innerHTML = `
      <div class="inventory-panel">
        <div class="inventory-header">
          <p class="inventory-title">🔍 УЛИКИ (${clues.length})</p>
          <button id="btn-close-inventory" class="inventory-close">✕</button>
        </div>
        <div class="inventory-list">
          ${clues.length === 0 
            ? '<p class="inventory-empty">Пока нет улик. Осмотрите место преступления и поговорите со свидетелями.</p>'
            : clues.map(function(clue) {
                return `
                  <div class="inventory-item" data-clue-id="${clue.id}">
                    <span class="inventory-item-icon">${self._getCategoryIcon(clue.category)}</span>
                    <div class="inventory-item-info">
                      <p class="inventory-item-name">${clue.name}</p>
                      <p class="inventory-item-source">${clue.source || ''}</p>
                    </div>
                  </div>
                `;
              }).join('')
          }
        </div>
        ${clues.length > 0 ? '<p class="inventory-hint">Нажмите на улику, чтобы рассмотреть</p>' : ''}
      </div>
    `;

    // Обработчики
    document.getElementById('btn-close-inventory').addEventListener('click', function() {
      self.close();
    });

    this.container.querySelectorAll('.inventory-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var clueId = this.getAttribute('data-clue-id');
        self._showClueDetail(clueId);
      });
    });
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('inventory-open');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('inventory-open');
    Events.emit('inventory:closed');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  _showClueDetail(clueId) {
    var clue = GameState.getClue(clueId);
    if (!clue) return;

    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-modal">
        <div class="dialog-content">
          <p class="dialog-type-label">${this._getCategoryLabel(clue.category)}</p>
          <h3 class="text-gold text-lg mb-3">${clue.name}</h3>
          <p class="text-gray-400 text-sm leading-relaxed mb-4">${clue.description}</p>
          <div class="text-gray-600 text-xs space-y-1 mb-4">
            <p>📍 Найдено: ${clue.location || 'Неизвестно'}</p>
            <p>👤 Источник: ${clue.source || 'Неизвестно'}</p>
            <p>📅 День: ${clue.day || '?'}</p>
          </div>
          <button class="dialog-btn primary-btn close-detail">ЗАКРЫТЬ</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.close-detail').addEventListener('click', function() {
      overlay.remove();
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  _getCategoryIcon(category) {
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

  _getCategoryLabel(category) {
    var labels = {
      document: 'ДОКУМЕНТ',
      observation: 'НАБЛЮДЕНИЕ',
      object: 'ПРЕДМЕТ',
      information: 'ИНФОРМАЦИЯ',
      evidence: 'УЛИКА',
      important: 'ВАЖНОЕ'
    };
    return labels[category] || '';
  }
}