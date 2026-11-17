import { Events } from './events.js';
import { GameState } from './state.js';

/**
 * Маршрутизатор сцен.
 * Каждая сцена — отдельный модуль с функцией render(container, data).
 * Сцены загружаются динамически (lazy loading).
 */
export const Router = {
  _root: null,
  _currentScene: null,
  _sceneCache: new Map(),

  /**
   * Инициализация
   */
  init() {
    this._root = document.getElementById('game-root');

    // Слушаем события навигации
    Events.on('navigate', ({ scene, data }) => {
      this.goTo(scene, data);
    });

    // Слушаем нажатие кнопки "Назад" в браузере
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.scene) {
        this.goTo(event.state.scene, event.state.data, false);
      }
    });
  },

  /**
   * Перейти на сцену
   * @param {string} sceneName - Имя сцены (без .js)
   * @param {*} data - Данные для передачи в сцену
   * @param {boolean} pushState - Добавлять ли в историю браузера
   */
  async goTo(sceneName, data = {}, pushState = true) {
    // Показываем эффект перехода
    if (this._root) {
      this._root.style.opacity = '0';
      this._root.style.transition = 'opacity 0.2s ease';
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      // Очищаем корневой контейнер
      if (this._root) {
        this._root.innerHTML = '';
      }

      // Загружаем сцену (с кэшированием)
      let module;
      if (this._sceneCache.has(sceneName)) {
        module = this._sceneCache.get(sceneName);
      } else {
        module = await import(`../scenes/${sceneName}.js`);
        this._sceneCache.set(sceneName, module);
      }

      // Рендерим сцену
      await module.render(this._root, data);

      // Сохраняем текущую сцену
      this._currentScene = sceneName;

      // Добавляем в историю браузера
      if (pushState) {
        window.history.pushState({ scene: sceneName, data }, '', `#${sceneName}`);
      }

      // Отправляем событие
      Events.emit('scene:changed', { scene: sceneName, data });

      console.log(`[Router] Перешли на сцену: ${sceneName}`);
    } catch (error) {
      console.error(`[Router] Ошибка загрузки сцены "${sceneName}":`, error);
      if (this._root) {
        this._root.innerHTML = `
          <div class="scene items-center justify-center text-center">
            <p class="text-red-500 text-lg mb-4">⚠ Ошибка загрузки</p>
            <p class="text-gray-500 text-sm mb-6">Не удалось загрузить сцену "${sceneName}"</p>
            <button class="btn-noir" onclick="window.location.reload()">ПЕРЕЗАГРУЗИТЬ</button>
          </div>
        `;
      }
    }

    // Показываем контент
    if (this._root) {
      this._root.style.opacity = '1';
    }
  },

  /**
   * Текущая сцена
   */
  getCurrentScene() {
    return this._currentScene;
  }
};
