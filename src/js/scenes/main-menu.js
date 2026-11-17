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
    <div class="scene title-scene items-center justify-center relative">
      <div class="title-art" aria-hidden="true">
        <div class="title-moon"></div><div class="title-horizon"></div>
        <div class="title-cityline"></div><div class="title-pier"></div>
        <div class="title-water"></div><div class="title-vignette"></div>
      </div>

      <!-- Декоративный дождь (только на десктопе) -->
      <div class="hidden md:block absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        ${Array.from({ length: 50 }, function() {
          return '<div class="absolute w-px bg-gray-400" style="left: ' + Math.random() * 100 + '%; top: ' + Math.random() * 100 + '%; height: ' + (30 + Math.random() * 80) + 'px; animation: rain ' + (1.5 + Math.random() * 3) + 's linear infinite; animation-delay: ' + Math.random() * 3 + 's;"></div>';
        }).join('')}
      </div>

      <!-- Основной контент -->
      <div class="relative z-10 w-full max-w-3xl mx-auto title-content">
        <p class="title-eyebrow">BLACKFORD · 1947 <span>—</span> ДЕЛО № 01</p>

        <!-- Название игры -->
        <div class="title-lockup text-center mb-12">
          <span class="title-rule"></span>
          <h1 class="title-logo"><span>МЁРТВЫЙ</span><span>ШТИЛЬ</span></h1>
          <p class="title-subtitle">ТАЙНЫ ПОРТОВОГО ГОРОДА</p>
        </div>

        <!-- Кнопки меню -->
        <div class="title-actions flex flex-col gap-3 justify-center px-4 md:px-0">

          <!-- Новая игра -->
          <button id="btn-new-game" class="btn-noir title-primary py-3 md:py-4 px-6 md:px-10">
            <span>01</span> НОВОЕ РАССЛЕДОВАНИЕ <b>↗</b>
          </button>

          <!-- Продолжить (неактивна, если нет сохранения) -->
          <button 
            id="btn-continue" 
            class="btn-noir py-3 md:py-4 px-6 md:px-10 ${hasSave ? '' : 'opacity-40'}" 
            ${hasSave ? '' : 'disabled'}
          >
            <span>02</span> ПРОДОЛЖИТЬ <b>↗</b>
          </button>

          <!-- Настройки -->
          <button id="btn-settings" class="btn-noir py-3 md:py-4 px-6 md:px-10 opacity-70">
            <span>03</span> НАСТРОЙКИ <b>↗</b>
          </button>

        </div>

        <!-- Информация о сохранении -->
        ${hasSave 
          ? '<p class="text-center text-gray-600 text-xs mt-6">' + saveInfo + '</p>' 
          : '<p class="text-center text-gray-700 text-xs mt-6">Нет сохранений</p>'
        }

        <!-- Цитата (только на десктопе) -->
        <div class="hidden md:block text-center mt-10 title-quote">
          <p class="text-gray-600 italic text-sm tracking-wider">
            «В этом городе правда тонет быстрее, чем ложь успевает доплыть до берега»
          </p>
          <p class="text-gray-700 text-xs mt-2">— Маркус Холт, детектив</p>
        </div>

      </div>

      <!-- Версия игры -->
      <p class="absolute bottom-4 md:bottom-8 text-gray-700 text-xs tracking-widest">
        МЁРТВЫЙ ШТИЛЬ · ВИЗУАЛЬНОЕ ИЗДАНИЕ
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
