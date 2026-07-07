/**
 * Шина событий — центральная нервная система приложения.
 * Все модули общаются только через неё.
 *
 * Использование:
 *   import { Events } from './core/events.js';
 *   Events.on('clue_found', (data) => { ... });
 *   Events.emit('clue_found', { id: 'knife_01' });
 */
export const Events = {
  _listeners: {},

  /**
   * Подписаться на событие
   * @param {string} event - Имя события
   * @param {Function} callback - Функция-обработчик
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);

    // Возвращаем функцию для отписки
    return () => this.off(event, callback);
  },

  /**
   * Отписаться от события
   */
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  /**
   * Вызвать событие
   * @param {string} event - Имя события
   * @param {*} data - Данные, передаваемые обработчикам
   */
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[Events] Ошибка в обработчике "${event}":`, error);
      }
    });
  },

  /**
   * Подписаться на событие ОДИН раз
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  },

  /**
   * Очистить все подписки (для отладки)
   */
  clear() {
    this._listeners = {};
  }
};