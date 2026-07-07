import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { NPCMemory } from '../systems/npc-memory.js';

/**
 * Главное меню игры «Мёртвый штиль».
 * Отображается при запуске игры.
 * Позволяет начать новую игру, продолжить сохранённую или открыть настройки.
 */
export function render(container) {
  var hasSave = GameState.hasSave();
  var saveInfo = '';

  // Формируем информацию о сохранении
  if (hasSave) {
    var cluesCount = GameState.currentCase.clues.length;
    var notesCount = GameState.notebook ? GameState.notebook.length : 0;
    var npcCount = GameState.npcMemory ? Object.keys(GameState.npcMemory).length : 0;
    saveInfo = 'Улик: ' + cluesCount + ' | Заметок: ' + notesCount + ' | NPC в памяти: ' + npcCount;
  }

  container.innerHTML = `
    <div class="scene items-center justify-center relative">

      <!-- Декоративный дождь (только на десктопе) -->
      <div class="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        ${Array.from({ length: 50 }, function() {
          return '<div class="absolute w-px bg-gray-400" style="left: ' + Math.random() * 100 + '%; top: ' + Math.random() * 100 + '%; height: ' + (30 + Math.random() * 80) + 'px; animation: rain ' + (1.5 + Math.random() * 3) + 's linear infinite; animation-delay: ' + Math.random() * 3 + 's;"></div>';
        }).join('')}
      </div>

      <!-- Основной контент -->
      <div class="relative z-10 w-full max-w-2xl mx-auto">

        <!-- Название игры -->
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-7xl text-gold tracking-[0.2em] md:tracking-[0.3em] font-typewriter mb-2 md:mb-4">
            МЁРТВЫЙ
          </h1>
          <h1 class="text-4xl md:text-7xl text-gold tracking-[0.2em] md:tracking-[0.3em] font-typewriter">
            ШТИЛЬ
          </h1>
          <div class="w-16 md:w-32 h-px bg-blood mx-auto mt-4 md:mt-8"></div>
          <p class="text-gray-500 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] mt-4 md:mt-6">
            ДЕТЕКТИВНЫЙ ТРИЛЛЕР
          </p>
        </div>

        <!-- Кнопки меню -->
        <div class="flex flex-col md:flex-row gap-3 md:gap-6 justify-center px-4 md:px-0">

          <!-- Новая игра -->
          <button id="btn-new-game" class="btn-noir py-3 md:py-4 px-6 md:px-10">
            НОВАЯ ИГРА
          </button>

          <!-- Продолжить (неактивна, если нет сохранения) -->
          <button 
            id="btn-continue" 
            class="btn-noir py-3 md:py-4 px-6 md:px-10 ${hasSave ? '' : 'opacity-40'}" 
            ${hasSave ? '' : 'disabled'}
          >
            ПРОДОЛЖИТЬ
          </button>

          <!-- Настройки -->
          <button id="btn-settings" class="btn-noir py-3 md:py-4 px-6 md:px-10 opacity-70">
            НАСТРОЙКИ
          </button>

        </div>

        <!-- Информация о сохранении -->
        ${hasSave 
          ? '<p class="text-center text-gray-600 text-xs mt-6">' + saveInfo + '</p>' 
          : '<p class="text-center text-gray-700 text-xs mt-6">Нет сохранений</p>'
        }

        <!-- Цитата (только на десктопе) -->
        <div class="hidden md:block text-center mt-16">
          <p class="text-gray-600 italic text-sm tracking-wider">
            «В этом городе правда тонет быстрее, чем ложь успевает доплыть до берега»
          </p>
          <p class="text-gray-700 text-xs mt-2">— Маркус Холт, детектив</p>
        </div>

      </div>

      <!-- Версия игры -->
      <p class="absolute bottom-4 md:bottom-8 text-gray-700 text-xs tracking-widest">
        v 0.8.0 — ЭТАП 8
      </p>
    </div>
  `;

  // === ОБРАБОТЧИКИ КНОПОК ===

  /**
   * Кнопка «Новая игра»
   * Сбрасывает всё состояние и начинает с чистого листа
   */
  document.getElementById('btn-new-game').addEventListener('click', function() {
    // Инициализируем аудио (требуется взаимодействие пользователя)
    Audio.init();

    // Если есть сохранение — спрашиваем подтверждение
    if (hasSave) {
      var confirmed = confirm('У вас есть сохранение. Начать новую игру? Весь прогресс будет потерян.');
      if (!confirmed) return;
    }

    // === ПОЛНЫЙ СБРОС ВСЕГО ===
    console.log('═══════════════════════════════');
    console.log('🆕 НАЧАЛО НОВОЙ ИГРЫ');
    console.log('═══════════════════════════════');

    // 1. Сбрасываем игровое состояние (улики, заметки, флаги)
    GameState.reset();

    // 2. Явно очищаем память всех NPC
    NPCMemory.resetAll();

    // 3. Очищаем отношения
    GameState.relationships = {};

    // 4. Сохраняем пустое состояние
    GameState.save();

    // Логируем результат сброса
    console.log('[Menu] ✅ Состояние полностью сброшено');
    console.log('[Menu]    - Память NPC: ' + Object.keys(GameState.npcMemory).length + ' записей');
    console.log('[Menu]    - Отношения: ' + Object.keys(GameState.relationships).length + ' записей');
    console.log('[Menu]    - Улики: ' + GameState.currentCase.clues.length);
    console.log('[Menu]    - Заметки: ' + (GameState.notebook ? GameState.notebook.length : 0));
    console.log('[Menu]    - Флаги: ' + Object.keys(GameState.flags).length);

    // Переходим в кабинет — начало игры
    Events.emit('navigate', { scene: 'office' });
  });

  /**
   * Кнопка «Продолжить»
   * Загружает сохранённое состояние и продолжает игру
   */
  document.getElementById('btn-continue').addEventListener('click', function() {
    // Если нет сохранения — кнопка не работает
    if (!hasSave) return;

    // Инициализируем аудио
    Audio.init();

    // Загружаем сохранённое состояние
    GameState.init();

    console.log('[Menu] 📂 Загрузка сохранения...');
    console.log('[Menu]    - Память NPC: ' + Object.keys(GameState.npcMemory).length + ' записей');
    console.log('[Menu]    - Улик: ' + GameState.currentCase.clues.length);
    console.log('[Menu]    - Заметок: ' + (GameState.notebook ? GameState.notebook.length : 0));

    // Переходим в кабинет
    Events.emit('navigate', { scene: 'office' });
  });

  /**
   * Кнопка «Настройки»
   * Показывает информационное окно (в будущем — полноценные настройки)
   */
  document.getElementById('btn-settings').addEventListener('click', function() {
    Audio.init();

    // Пока что просто информационное окно
    var message = '🎮 НАСТРОЙКИ\n\n';
    message += 'Полноценные настройки появятся в следующих обновлениях.\n\n';
    message += 'Текущее состояние игры:\n';
    message += '• NPC в памяти: ' + Object.keys(GameState.npcMemory).length + '\n';
    message += '• Улик собрано: ' + GameState.currentCase.clues.length + '\n';
    message += '• Заметок в дневнике: ' + (GameState.notebook ? GameState.notebook.length : 0) + '\n';
    message += '• Флагов установлено: ' + Object.keys(GameState.flags).length + '\n\n';
    message += 'Планируется:\n';
    message += '• Громкость музыки и звуков\n';
    message += '• Скорость текста\n';
    message += '• Язык интерфейса\n';
    message += '• Сброс прогресса';

    alert(message);
  });
}