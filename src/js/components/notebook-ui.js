import { Notebook } from '../systems/notebook.js';
import { Events } from '../core/events.js';
import { escapeHtml } from '../utils/helpers.js';
import { evidenceCategoryLabel, resolveEvidenceLinks, selectEvidence } from '../systems/evidence-archive.js';

let clueCatalogRequest;
function loadClueCatalog() {
  if (!clueCatalogRequest) {
    clueCatalogRequest = fetch('src/data/clues.json')
      .then(response => {
        if (!response.ok) throw new Error(`Каталог улик: ${response.status}`);
        return response.json();
      })
      .catch(error => {
        console.warn('[Notebook] Каталог связей недоступен:', error);
        clueCatalogRequest = null;
        return {};
      });
  }
  return clueCatalogRequest;
}

/**
 * UI-компонент дневника.
 * Отображает заметки с фильтрацией и поиском.
 */
export class NotebookUI {
  constructor(container) {
    this.container = container;
    this.filter = 'all';
    this.searchQuery = '';
    this.evidenceCategory = 'all';
    this.evidenceSort = 'newest';
  }

  render() {
    const isEvidence = this.filter === 'clues';
    const allClues = Notebook.getAllClues();
    var notes = isEvidence ? selectEvidence(allClues, {
      category: this.evidenceCategory,
      sort: this.evidenceSort,
      query: this.searchQuery
    }).map(clue => ({
      ...clue,
      title: clue.name || 'Без названия',
      text: clue.description || '',
      timestamp: clue.foundAt || '',
      day: clue.day || 1,
      source: clue.source || 'Источник не установлен',
      category: evidenceCategoryLabel(clue.category),
      isClue: true
    })) : Notebook.getAllNotes();
    var stats = Notebook.getStats();
    var clueCount = allClues.length;
    var self = this;

    // Применяем фильтр
    if (this.filter === 'important') {
      notes = Notebook.getImportantNotes();
    } else if (this.filter === 'day1') {
      notes = Notebook.getNotesByDay(1);
    } else if (this.filter !== 'all' && this.filter !== 'clues') {
      notes = Notebook.getNotesByCategory(this.filter);
    }

    // Применяем поиск
    if (this.searchQuery && !isEvidence) {
      var query = this.searchQuery.toLowerCase();
      notes = notes.filter(function(n) {
        return String(n.title || '').toLowerCase().includes(query) ||
               String(n.text || '').toLowerCase().includes(query) ||
               String(n.source || '').toLowerCase().includes(query);
      });
    }

    // Сортируем: закреплённые сверху, потом по дате
    if (!isEvidence) notes.sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const availableCategories = [...new Set(allClues.map(clue => clue.category || 'other'))].sort();

    this.container.innerHTML = `
      <div class="notebook-container dossier-notebook">
        <!-- Заголовок и статистика -->
        <div class="notebook-header">
          <div class="notebook-title-row">
            <p class="notebook-title"><span class="dossier-seal">MH</span> ЛИЧНЫЙ ЖУРНАЛ / М. ХОЛТ</p>
            <p class="notebook-stats">ЗАПИСЕЙ: ${stats.total} · УЛИК: ${clueCount} · ВАЖНЫХ: ${stats.important}</p>
          </div>

          ${isEvidence ? `<div class="notebook-evidence-tools">
            <label>ТИП УЛИКИ
              <select id="evidence-category" aria-label="Категория улик">
                <option value="all">Все категории</option>
                ${availableCategories.map(category => `<option value="${escapeHtml(category)}" ${this.evidenceCategory === category ? 'selected' : ''}>${escapeHtml(evidenceCategoryLabel(category))}</option>`).join('')}
              </select>
            </label>
            <label>ПОРЯДОК
              <select id="evidence-sort" aria-label="Сортировка улик">
                <option value="newest" ${this.evidenceSort === 'newest' ? 'selected' : ''}>Сначала новые</option>
                <option value="oldest" ${this.evidenceSort === 'oldest' ? 'selected' : ''}>Сначала старые</option>
              </select>
            </label>
          </div>` : ''}

          <!-- Поиск -->
          <div class="notebook-search">
            <input type="text" id="notebook-search-input"
                   class="notebook-search-input"
                   aria-label="${isEvidence ? 'Поиск по уликам' : 'Поиск по заметкам'}"
                   placeholder="${isEvidence ? 'Название, описание или место находки...' : 'Найти запись по слову или имени...'}"
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
            <button class="notebook-filter ${this.filter === 'clues' ? 'active' : ''}" data-filter="clues">
              ◇ Улики (${clueCount})
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
    var date = new Date(note.timestamp || '');
    var dateStr = Number.isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleDateString('ru-RU', {
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
      <button type="button" class="notebook-card ${note.pinned ? 'notebook-card-pinned' : ''}" data-title="${escapeHtml(note.title || 'Без названия')}" ${!note.isClue && note.id ? `data-note-id="${escapeHtml(note.id)}"` : ''} ${!note.isClue && note.id ? `data-note-id="${escapeHtml(note.id)}"` : ''} ${note.isClue ? `data-clue-id="${escapeHtml(note.id || '')}"` : ''} data-kind="${note.isClue ? 'clue' : 'note'}" aria-label="Открыть: ${escapeHtml(note.title || 'Без названия')}">
        <div class="notebook-card-header">
          <span class="notebook-category ${categoryColors[note.category] || ''}">${escapeHtml(note.category || 'Общее')}</span>
          ${note.pinned ? '<span class="notebook-pin">◆ ЗАКРЕПЛЕНО</span>' : ''}
          <span class="notebook-day">${note.isClue ? 'УЛИКА' : `День ${note.day || 1}`}</span>
        </div>
        <p class="notebook-card-title">${escapeHtml(note.title)}</p>
        <p class="notebook-card-text">${escapeHtml(String(note.text || '').substring(0, 180))}${String(note.text || '').length > 180 ? '…' : ''}</p>
        <div class="notebook-card-footer">
          <span class="notebook-date">${escapeHtml(dateStr)}</span>
          <span class="notebook-source">${escapeHtml(note.source || 'Не указан')}</span>
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

    this.container.querySelector('#evidence-category')?.addEventListener('change', function() {
      self.evidenceCategory = this.value;
      self.render();
    });
    this.container.querySelector('#evidence-sort')?.addEventListener('change', function() {
      self.evidenceSort = this.value;
      self.render();
    });

    // Поиск
    var searchInput = this.container.querySelector('#notebook-search-input');
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
        if (this.getAttribute('data-kind') === 'clue') {
          self._showClueDetail(this.getAttribute('data-clue-id') || title);
        } else {
          self._showNoteDetail(this.getAttribute('data-note-id') || title);
        }
      });
    });

    // Экспорт
    var exportBtn = this.container.querySelector('#btn-export-notes');
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

  async _showClueDetail(title, returnFocus = document.activeElement) {
    const foundClues = Notebook.getAllClues();
    const clue = foundClues.find(c => c.id === title || c.name === title);
    if (!clue) return;
    const catalog = await loadClueCatalog();
    const links = resolveEvidenceLinks(clue, foundClues, catalog);
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-modal cinematic-dialog notebook-evidence-detail" role="dialog" aria-modal="true" aria-label="Материалы дела">
        <div class="dialog-content cinematic-dialog-content">
          <p class="dialog-type-label">◇ УЛИКА · МАТЕРИАЛЫ ДЕЛА</p>
          <h3 class="notebook-evidence-title">${escapeHtml(clue.name || '')}</h3>
          <p class="notebook-evidence-description">${escapeHtml(clue.description || '')}</p>
          <p class="notebook-evidence-source">ИСТОЧНИК: ${escapeHtml(clue.source || 'Не установлен')}</p>
          <p class="notebook-evidence-location">МЕСТО ОБНАРУЖЕНИЯ: ${escapeHtml(clue.location || 'Не зафиксировано')}</p>
          ${links.length ? `<section class="notebook-evidence-links" aria-label="Связанные материалы">
            <p class="notebook-evidence-links-title">СВЯЗАННЫЕ МАТЕРИАЛЫ · ${links.filter(link => link.found).length}/${links.length}</p>
            <ul>${links.map(link => `<li>${link.found
              ? `<button type="button" class="notebook-evidence-link" data-clue-id="${escapeHtml(link.id)}"><span>◇ ${escapeHtml(link.name || 'Без названия')}</span><span>ОТКРЫТЬ →</span></button>`
              : '<span class="notebook-evidence-locked"><span>◇ Неизвестный материал</span><span>НЕ НАЙДЕНО</span></span>'}</li>`).join('')}</ul>
          </section>` : ''}
          <button type="button" class="dialog-btn primary-btn close-detail">ЗАКРЫТЬ</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = (restoreFocus = true) => {
      overlay.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    };
    const onKeydown = event => { if (event.key === 'Escape') close(); };
    overlay.addEventListener('keydown', onKeydown);
    overlay.querySelector('.close-detail').addEventListener('click', () => close());
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.querySelectorAll('[data-clue-id]').forEach(button => {
      button.addEventListener('click', () => {
        const relatedId = button.getAttribute('data-clue-id');
        close(false);
        this._showClueDetail(relatedId, returnFocus);
      });
    });
    overlay.querySelector('.close-detail').focus();
  }

  _showNoteDetail(identifier) {
    var notes = Notebook.getAllNotes();
    var note = notes.find(function(n) { return n.id === identifier || (!n.id && n.title === identifier); });
    if (!note) return;

    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    var date = new Date(note.timestamp || '');
    var dateStr = Number.isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    overlay.innerHTML = `
      <div class="dialog-modal notebook-note-detail" role="dialog" aria-modal="true" aria-label="Запись дневника">
        <div class="dialog-content">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="dialog-type-label">${escapeHtml(String(note.category || 'общее').toUpperCase())} — ДЕНЬ ${note.day || 1}</p>
              <h3 class="text-gold text-lg mt-1">${note.pinned ? '◆ ' : ''}${escapeHtml(note.title)}</h3>
            </div>
            <div class="flex gap-2">
              <button class="notebook-action-btn btn-pin" aria-label="Закрепить или открепить заметку">
                ${note.pinned ? '◆' : '◇'}
              </button>
            </div>
          </div>

          <p class="notebook-note-detail-text">${escapeHtml(note.text || 'Текст записи отсутствует.')}</p>

          <div class="notebook-note-detail-meta">
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
    const returnFocus = document.activeElement;
    document.body.appendChild(overlay);
    const close = (restoreFocus = true) => {
      overlay.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    };
    const onKeydown = event => {
      if (event.key === 'Escape') close();
    };
    overlay.addEventListener('keydown', onKeydown);
    overlay.querySelector('.close-detail').addEventListener('click', () => close());
    overlay.querySelector('.close-detail').focus();

    overlay.querySelector('.btn-pin').addEventListener('click', function() {
      Notebook.togglePin(note.id || note.title);
      close(false);
      self.render();
    });

    overlay.querySelector('.delete-note').addEventListener('click', function() {
      if (confirm('Удалить заметку "' + note.title + '"?')) {
        Notebook.removeNote(note.id || note.title);
        close(false);
        self.render();
      }
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
  }
}
