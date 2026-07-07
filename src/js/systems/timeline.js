import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

/**
 * Система хронологии событий.
 * Отслеживает правильный порядок событий и прогресс игрока.
 */
export var Timeline = {
  _events: [],
  _correctOrder: [],
  _playerOrder: [],
  _initialized: false,

  async init() {
    if (this._initialized) return;
    try {
      var response = await fetch('src/data/timeline-events.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var data = await response.json();
      this._events = data.events;
      this._correctOrder = this._events.map(function(e) { return e.id; });
      this._initialized = true;
      console.log('[Timeline] Загружено событий: ' + this._events.length);
    } catch (error) {
      console.error('[Timeline] Ошибка загрузки:', error);
      this._events = [];
      this._correctOrder = [];
      this._initialized = true;
    }
  },

  /**
   * Получить все события
   */
  getAllEvents() {
    return this._events.slice();
  },

  /**
   * Получить события по категории
   */
  getEventsByCategory(category) {
    return this._events.filter(function(e) {
      return e.category === category;
    });
  },

  /**
   * Получить перемешанные события для игры
   */
  getShuffledEvents() {
    var events = this._events.slice();
    // Перемешиваем
    for (var i = events.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = events[i];
      events[i] = events[j];
      events[j] = temp;
    }
    return events;
  },

  /**
   * Проверить порядок событий
   * @returns {object} Результат проверки
   */
  checkOrder(playerOrder) {
    var correct = 0;
    var total = this._correctOrder.length;
    
    for (var i = 0; i < Math.min(playerOrder.length, total); i++) {
      if (playerOrder[i] === this._correctOrder[i]) {
        correct++;
      }
    }

    var percentage = Math.floor((correct / total) * 100);
    
    return {
      correct: correct,
      total: total,
      percentage: percentage,
      isPerfect: correct === total,
      wrongPositions: this._getWrongPositions(playerOrder)
    };
  },

  /**
   * Получить неправильные позиции
   */
  _getWrongPositions(playerOrder) {
    var wrong = [];
    for (var i = 0; i < playerOrder.length; i++) {
      if (playerOrder[i] !== this._correctOrder[i]) {
        wrong.push({
          position: i,
          placed: playerOrder[i],
          expected: this._correctOrder[i]
        });
      }
    }
    return wrong;
  },

  /**
   * Получить событие по ID
   */
  getEventById(id) {
    return this._events.find(function(e) { return e.id === id; }) || null;
  },

  /**
   * Получить подсказку для неправильной позиции
   */
  getHintForPosition(position) {
    var correctEvent = this.getEventById(this._correctOrder[position]);
    if (!correctEvent) return 'Подумайте, что должно быть на этом месте.';
    
    return 'Это событие произошло в ' + correctEvent.year + ' году, ' + correctEvent.month + '.';
  }
};