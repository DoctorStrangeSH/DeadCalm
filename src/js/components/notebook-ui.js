import { Notebook } from '../systems/notebook.js';
import { Events } from '../core/events.js';
import { escapeHtml } from '../utils/helpers.js';

/**
 * UI-компонент дневника.
 * Отображает заметки с фильтрацией и поиском.
 */
export class NotebookUI {
  constructor(container) {
    this.container = container;
    this.filter = 'all';
    this.searchQuery = '';
  }

  render() {
    var notes = Notebook.getAllNotes();
    var stats = Notebook.getStats();
    var self = this;

    // Применяем фильтр
    if (this.filter === 'important') {
      notes = Notebook.getImportantNotes();
    } else if (this.filter === 'day1') {
      notes = Notebook.getNotesByDay(1);
    } else if (this.filter !== 'all') {
      notes = Notebook.getNotesByCategory(this.filter);
    }

    // Применяем поиск
    if (this.searchQuery) {
      var query = this.searchQuery.toLowerCase();
      notes = notes.filter(function(n) {
        return n.title.toLowerCase().indexOf(query) !== -1 ||
               n.text.toLowerCase().indexOf(query) !== -1;
      });
    }

    // Сортируем: закреплённые сверху, потом по дате
    notes.sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    this.container.innerHTML = `
      <div class="notebook-container dossier-notebook">
        <!-- Заголовок и статистика -->
        <div class="notebook-header">
          <div class="notebook-title-row">
            <p class="notebook-title"><span class="dossier-seal">MH</span> ЛИЧНЫЙ ЖУРНАЛ / М. ХОЛТ</p>
            <p class="notebook-stats">ЗАПИСЕЙ: ${stats.total} · ВАЖНЫХ: ${stats.important}</p>
          </div>
          
          <!-- Поиск -->
          <div class="notebook-search">
            <input type="text" id="notebook-search-input" 
                   class="notebook-search-input" 
                   aria-label="Поиск по заметкам"
                   placeholder="Найти запись по слову или имени..."
                   value="${escapeHtml(this.searchQuery)}">
          </div>

          <!-- Фильтры -->
          <div class="notebook-filters">
            <button class="notebook-filter ${this.filter === 'all' ? 'active' : ''}" data-filter="all">
              Все (${stats.total})
            </button>
            <button class="notebook-filter ${this.filter === 'important' ? 'active' : ''}" data-filter="important">
              ★ Важные
            </button>
            <button class="notebook-filter ${this.filter === 'day1' ? 'active' : ''}" data-filter="day1">
              День 1
            </button>
            <button class="notebook-filter ${this.filter === 'расследование' ? 'active' : ''}" data-filter="расследование">
              Расследование
            </button>
          </div>
        </div>

        <!-- Список заметок -->
        <div class="notebook-list">
          ${notes.length === 0 ? this._renderEmpty() : notes.map(function(note) {
            return self._renderNoteCard(note);
          }).join('')}
        </div>

        <!-- Действия -->
        <div class="notebook-actions">
          <button id="btn-export-notes" class="btn-noir text-xs py-2">↓ СОХРАНИТЬ ЗАПИСИ</button>
        </div>
      </div>
    `;

    this._setupHandlers();
  }

  _renderNoteCard(note) {
    var date = new Date(note.timestamp);
    var dateStr = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    var categoryColors = {
      'важное': 'category-important',
      'расследование': 'category-investigation',
      'персоналии': 'category-people',
      'улики': 'category-evidence',
      'общее': 'category-general'
    };

    return `
      <button type="button" class="notebook-card ${note.pinned ? 'notebook-card-pinned' : ''}" data-title="${escapeHtml(note.title)}">
        <div class="notebook-card-header">
          <span class="notebook-category ${categoryColors[note.category] || ''}">${escapeHtml(note.category)}</span>
          ${note.pinned ? '<span class="notebook-pin">◆ ЗАКРЕПЛЕНО</span>' : ''}
          <span class="notebook-day">День ${note.day}</span>
        </div>
        <p class="notebook-card-title">${escapeHtml(note.title)}</p>
        <p class="notebook-card-text">${escapeHtml(note.text.substring(0, 180))}${note.text.length > 180 ? '…' : ''}</p>
        <div class="notebook-card-footer">
          <span class="notebook-date">${escapeHtml(dateStr)}</span>
          <span class="notebook-source">${escapeHtml(note.source)}</span>
        </div>
      </button>
    `;
  }

  _renderEmpty() {
    var messages = [
      'Пока ничего не записано. Отправляйтесь на расследование, чтобы собрать информацию.',
      'Страницы дневника чисты. Самое время найти первые зацепки.',
      'Здесь появятся важные факты и наблюдения. Начните с осмотра места преступления.'
    ];
    var msg = messages[Math.floor(Math.random() * messages.length)];

    return `
      <div class="notebook-empty">
        <p class="notebook-empty-icon">✎</p>
        <p class="notebook-empty-text">${msg}</p>
      </div>
    `;
  }

  _setupHandlers() {
    var self = this;

    // Поиск
    var searchInput = document.getElementById('notebook-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const caret = this.selectionStart;
        self.searchQuery = this.value;
        self.render();
        const updated = self.container.querySelector('#notebook-search-input');
        updated.focus();
        updated.setSelectionRange(caret, caret);
      });
    }

    // Фильтры
    this.container.querySelectorAll('.notebook-filter').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.filter = this.getAttribute('data-filter');
        self.render();
      });
    });

    // Клик по заметке — просмотр деталей
    this.container.querySelectorAll('.notebook-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var title = this.getAttribute('data-title');
        self._showNoteDetail(title);
      });
    });

    // Экспорт
    var exportBtn = document.getElementById('btn-export-notes');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var text = Notebook.exportToText();
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'дневник_детектива.txt';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  _showNoteDetail(title) {
    var notes = Notebook.getAllNotes();
    var note = notes.find(function(n) { return n.title === title; });
    if (!note) return;

    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    var date = new Date(note.timestamp);
    var dateStr = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    overlay.innerHTML = `
      <div class="dialog-modal">
        <div class="dialog-content">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="dialog-type-label">${escapeHtml(note.category.toUpperCase())} — ДЕНЬ ${note.day}</p>
              <h3 class="text-gold text-lg mt-1">${note.pinned ? '◆ ' : ''}${escapeHtml(note.title)}</h3>
            </div>
            <div class="flex gap-2">
              <button class="notebook-action-btn btn-pin" aria-label="Закрепить или открепить заметку">
                ${note.pinned ? '◆' : '◇'}
              </button>
            </div>
          </div>

          <p class="text-gray-400 text-sm leading-relaxed mb-4">${escapeHtml(note.text)}</p>

          <div class="text-gray-600 text-xs space-y-1 mb-4">
            <p>Дата: ${escapeHtml(dateStr)}</p>
            <p>Источник: ${escapeHtml(note.source)}</p>
          </div>

          <div class="flex gap-2">
            <button class="dialog-btn primary-btn close-detail">ЗАКРЫТЬ</button>
            <button class="dialog-btn leave-btn delete-note">УДАЛИТЬ ЗАПИСЬ</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.close-detail').addEventListener('click', function() {
      overlay.remove();
    });

    overlay.querySelector('.btn-pin').addEventListener('click', function() {
      Notebook.togglePin(title);
      overlay.remove();
      self.render();
    });

    overlay.querySelector('.delete-note').addEventListener('click', function() {
      if (confirm('Удалить заметку "' + note.title + '"?')) {
        Notebook.removeNote(title);
        overlay.remove();
        self.render();
      }
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  }
}
