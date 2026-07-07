import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';

/**
 * Менеджер мини-игр.
 * Запускает мини-игры, отслеживает результаты, выдаёт награды.
 * 
 * Доступные игры:
 * - lockpick: взлом замка (штифты)
 * - cipher: расшифровка кода
 * - fingerprints: снятие отпечатков
 * - chase: погоня с QTE
 */
export var Minigames = {
  _activeGame: null,
  _overlay: null,

  /**
   * Реестр доступных мини-игр
   */
  games: {
    lockpick: {
      name: 'Взлом замка',
      description: 'Подберите отмычки в правильном порядке, чтобы открыть замок.',
      difficulty: 'easy',
      reward: 'Доступ к запертой комнате'
    },
    cipher: {
      name: 'Расшифровка послания',
      description: 'Расшифруйте закодированное сообщение, сопоставляя символы.',
      difficulty: 'medium',
      reward: 'Секретная информация'
    },
    fingerprints: {
      name: 'Снятие отпечатков',
      description: 'Аккуратно соберите отпечатки с поверхности, не повредив их.',
      difficulty: 'easy',
      reward: 'Улика: отпечатки пальцев'
    },
    chase: {
      name: 'Погоня',
      description: 'Преследуйте подозреваемого, уклоняясь от препятствий.',
      difficulty: 'hard',
      reward: 'Подозреваемый пойман'
    }
  },

  /**
   * Запустить мини-игру
   * @param {string} gameType - Тип игры: lockpick, cipher, fingerprints, chase
   * @param {object} config - Настройки конкретной игры
   * @returns {Promise} - Результат игры (resolve) или ошибка (reject)
   * 
   * Пример использования:
   * Minigames.start('lockpick', { pins: 5, attempts: 3 })
   *   .then(function(result) { console.log('Победа!', result); })
   *   .catch(function(error) { console.log('Поражение:', error); });
   */
  start: function(gameType, config) {
    var self = this;
    var gameConfig = this.games[gameType];

    if (!gameConfig) {
      console.error('[Minigames] Игра не найдена: ' + gameType);
      return Promise.reject('Игра не найдена: ' + gameType);
    }

    console.log('[Minigames] Запуск: ' + gameConfig.name);
    console.log('[Minigames] Настройки:', config);

    return new Promise(function(resolve, reject) {
      // Создаём оверлей для игры
      self._createOverlay();

      // Динамически загружаем компонент игры
      var componentPath = '../components/minigame-' + gameType + '.js';

      import(componentPath)
        .then(function(module) {
          var GameClass = module.default;
          var game = new GameClass(self._overlay, config || {});

          game.start()
            .then(function(result) {
              self._closeOverlay();
              console.log('[Minigames] ✅ Победа в ' + gameType + '!');
              Events.emit('minigame:completed', {
                type: gameType,
                result: result,
                reward: gameConfig.reward
              });
              resolve(result);
            })
            .catch(function(error) {
              self._closeOverlay();
              console.log('[Minigames] ❌ Поражение в ' + gameType + ': ' + error);
              Events.emit('minigame:failed', {
                type: gameType,
                error: error
              });
              reject(error);
            });
        })
        .catch(function(error) {
          self._closeOverlay();
          console.error('[Minigames] Ошибка загрузки компонента:', error);
          reject('Ошибка загрузки мини-игры: ' + gameType);
        });
    });
  },

  /**
   * Создать оверлей для мини-игры
   */
  _createOverlay: function() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'dialog-overlay';
    this._overlay.innerHTML = '<div class="dialog-modal minigame-modal" id="minigame-container"></div>';
    document.body.appendChild(this._overlay);
  },

  /**
   * Закрыть оверлей
   */
  _closeOverlay: function() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      var self = this;
      setTimeout(function() {
        if (self._overlay) {
          self._overlay.remove();
        }
        self._overlay = null;
      }, 300);
    }
  },

  /**
   * Получить информацию об игре
   * @param {string} gameType - Тип игры
   * @returns {object|null}
   */
  getGameInfo: function(gameType) {
    return this.games[gameType] || null;
  },

  /**
   * Получить список всех игр
   * @returns {array}
   */
  getAllGames: function() {
    var self = this;
    return Object.keys(this.games).map(function(key) {
      return {
        id: key,
        name: self.games[key].name,
        description: self.games[key].description,
        difficulty: self.games[key].difficulty,
        reward: self.games[key].reward
      };
    });
  }
};