import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { escapeHtml } from '../utils/helpers.js';

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
      <div class="inventory-panel evidence-archive">
        <div class="inventory-header">
          <div><span class="archive-overline">BLACKFORD POLICE · CASE 001</span><p class="inventory-title">АРХИВ УЛИК <span>(${clues.length})</span></p></div>
          <button id="btn-close-inventory" class="inventory-close" aria-label="Закрыть архив">✕</button>
        </div>
        <div class="inventory-list">
          ${clues.length === 0 
            ? '<p class="inventory-empty">Пока нет улик. Осмотрите место преступления и поговорите со свидетелями.</p>'
            : clues.map(function(clue) {
                return `
                  <button type="button" class="inventory-item" data-clue-id="${escapeHtml(clue.id)}">
                    <span class="inventory-item-icon">${self._getCategoryIcon(clue.category)}</span>
                    <div class="inventory-item-info">
                      <p class="inventory-item-name">${escapeHtml(clue.name)}</p>
                      <p class="inventory-item-source">${escapeHtml(clue.source || 'Источник неизвестен')}</p>
                    </div>
                    <span class="archive-item-arrow" aria-hidden="true">↗</span>
                  </button>
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
          <h3 class="text-gold text-lg mb-3">${escapeHtml(clue.name)}</h3>
          <p class="text-gray-400 text-sm leading-relaxed mb-4">${escapeHtml(clue.description)}</p>
          <div class="text-gray-600 text-xs space-y-1 mb-4">
            <p>Место: ${escapeHtml(clue.location || 'Неизвестно')}</p>
            <p>Источник: ${escapeHtml(clue.source || 'Неизвестно')}</p>
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
      document: '▤',
      observation: '◎',
      object: '◆',
      information: '✎',
      evidence: '⌕',
      important: '★'
    };
    return icons[category] || '•';
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
