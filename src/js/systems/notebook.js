import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

/**
 * Система дневника детектива.
 * Хранит заметки, важную информацию и автоматические записи.
 */
export var Notebook = {
  /**
   * Добавить заметку в дневник
   */
  addNote(note) {
    if (!GameState.notebook) GameState.notebook = [];

    // Проверяем, нет ли уже такой заметки
    var exists = GameState.notebook.some(function(n) {
      return n.title === note.title;
    });

    if (exists) {
      console.log('[Notebook] Заметка уже существует: ' + note.title);
      return false;
    }

    GameState.notebook.push({
      id: note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title: note.title,
      text: note.text,
      category: note.category || 'общее',
      timestamp: new Date().toISOString(),
      day: note.day || 1,
      source: note.source || 'Заметки детектива',
      pinned: note.pinned || false
    });

    GameState.save();
    Events.emit('notebook:note_added', note);
    console.log('[Notebook] 📝 Добавлена заметка: ' + note.title);
    return true;
  },

  /**
   * Получить все заметки
   */
  getAllNotes() {
    return GameState.notebook || [];
  },

  getAllClues() {
    return GameState.currentCase?.clues || [];
  },

  /**
   * Получить заметки по категории
   */
  getNotesByCategory(category) {
    var notes = this.getAllNotes();
    return notes.filter(function(n) {
      return n.category === category;
    });
  },

  /**
   * Получить заметки по дню
   */
  getNotesByDay(day) {
    var notes = this.getAllNotes();
    return notes.filter(function(n) {
      return n.day === day;
    });
  },

  /**
   * Получить важные заметки
   */
  getImportantNotes() {
    var notes = this.getAllNotes();
    return notes.filter(function(n) {
      return n.category === 'важное' || n.pinned;
    });
  },

  /**
   * Закрепить/открепить заметку
   */
  togglePin(identifier) {
    var notes = GameState.notebook || [];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === identifier || (!notes[i].id && notes[i].title === identifier)) {
        notes[i].pinned = !notes[i].pinned;
        GameState.save();
        Events.emit('notebook:updated');
        return true;
      }
    }
    return false;
  },

  /**
   * Удалить заметку
   */
  removeNote(identifier) {
    var notes = GameState.notebook || [];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === identifier || (!notes[i].id && notes[i].title === identifier)) {
        notes.splice(i, 1);
        GameState.save();
        Events.emit('notebook:note_removed', identifier);
        return true;
      }
    }
    return false;
  },

  /**
   * Получить статистику
   */
  getStats() {
    var notes = this.getAllNotes();
    var categories = {};
    var days = {};

    notes.forEach(function(n) {
      categories[n.category] = (categories[n.category] || 0) + 1;
      days[n.day] = (days[n.day] || 0) + 1;
    });

    return {
      total: notes.length,
      categories: categories,
      days: days,
      important: this.getImportantNotes().length
    };
  },

  /**
   * Экспорт дневника в текст
   */
  exportToText() {
    var notes = this.getAllNotes();
    var text = '=== ДНЕВНИК ДЕТЕКТИВА ДЖОНА РИВЕРСА ===\n\n';

    var days = {};
    notes.forEach(function(n) {
      if (!days[n.day]) days[n.day] = [];
      days[n.day].push(n);
    });

    for (var day in days) {
      text += '\n--- ДЕНЬ ' + day + ' ---\n\n';
      days[day].forEach(function(n) {
        text += '[' + String(n.category || 'общее').toUpperCase() + '] ' + (n.title || 'Без названия') + '\n';
        text += (n.text || '') + '\n';
        if (n.source) text += 'Источник: ' + n.source + '\n';
        if (n.timestamp) text += 'Записано: ' + n.timestamp + '\n';
        text += '---\n\n';
      });
    }

    // The journal export is a complete case notebook: personal notes alone
    // are not enough to reconstruct what evidence the investigator found.
    var clues = this.getAllClues();
    text += '\n=== ОБНАРУЖЕННЫЕ УЛИКИ (' + clues.length + ') ===\n\n';
    clues.forEach(function(clue) {
      text += '[' + String(clue.category || 'прочее').toUpperCase() + '] ' +
        (clue.name || 'Без названия') + '\n';
      text += (clue.description || '') + '\n';
      text += 'Источник: ' + (clue.source || 'Не установлен') + '\n';
      text += 'Место обнаружения: ' + (clue.location || 'Не зафиксировано') + '\n';
      text += 'День: ' + (clue.day || 1) + '\n';
      if (clue.foundAt) text += 'Обнаружено: ' + clue.foundAt + '\n';
      text += 'ID: ' + (clue.id || 'не указан') + '\n---\n\n';
    });

    var hypotheses = Array.isArray(GameState.currentCase?.hypotheses) ? GameState.currentCase.hypotheses : [];
    text += '\n=== АРХИВ ГИПОТЕЗ (' + hypotheses.length + ') ===\n\n';
    hypotheses.forEach(function(hypothesis) {
      text += (hypothesis.title || 'Версия без названия') + '\n';
      text += 'Статус: ' + (hypothesis.status || 'unchecked') + '\n';
      text += (hypothesis.reasoning || '') + '\n';
      var attached = (hypothesis.clueIds || []).map(function(id) {
        var clue = clues.find(function(item) { return item.id === id; });
        return clue ? clue.name : null;
      }).filter(Boolean);
      text += 'Опорные улики: ' + (attached.length ? attached.join(', ') : 'Не указаны') + '\n';
      text += '---\n\n';
    });

    return text;
  }
};
