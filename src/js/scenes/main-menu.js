import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { createSaveFile, parseSaveFile } from '../core/save-transfer.js';
import { assessCampaignDay } from '../systems/campaign-progression.js';

/**
 * Главное меню игры «Мёртвый штиль».
 * Отображается при запуске игры.
 * Позволяет начать новую игру, продолжить сохранённую или открыть настройки.
 */
export function render(container) {
  var hasSave = GameState.hasSave();
  var saveBlocked = GameState.saveBlocked;
  var saveInfo = '';
  var settings = GameState.settings || { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };

  // Формируем информацию о сохранении
  if (hasSave && !saveBlocked) {
    var cluesCount = GameState.currentCase.clues.length;
    var notesCount = GameState.notebook ? GameState.notebook.length : 0;
    var campaignStatus = assessCampaignDay(GameState);
    var day = GameState.campaign?.day || 1;
    var progressLabel = campaignStatus.complete
      ? 'Расследование завершено'
      : campaignStatus.finaleReady
        ? 'Финальная встреча ждёт вас'
        : campaignStatus.canAdvance
          ? 'Можно завершить текущий день'
          : 'Осталось обязательных доказательств: ' + campaignStatus.missing.length;
    saveInfo = 'День ' + day + ' из 5 · ' + progressLabel +
      ' · Улик: ' + cluesCount + ' · Заметок: ' + notesCount;
  } else if (saveBlocked) {
    saveInfo = 'Сохранение повреждено или создано более новой версией. Продолжение временно заблокировано.';
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
        <p class="title-eyebrow">BLACKFORD · 1987 <span>—</span> ДЕЛО № 01</p>

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
            class="btn-noir py-3 md:py-4 px-6 md:px-10 ${hasSave && !saveBlocked ? '' : 'opacity-40'}"
            ${hasSave && !saveBlocked ? '' : 'disabled'}
          >
            <span>02</span> ПРОДОЛЖИТЬ <b>↗</b>
          </button>

          <!-- Перенос сохранения -->
          <div class="grid grid-cols-2 gap-3">
            <button id="btn-export-save" class="btn-noir py-3 px-4 text-sm" ${hasSave && !saveBlocked ? '' : 'disabled opacity-40'}>
              <span>↥</span> ЭКСПОРТ
            </button>
            <button id="btn-import-save" class="btn-noir py-3 px-4 text-sm">
              <span>↧</span> ИМПОРТ
            </button>
          </div>
          <input id="save-import-file" type="file" accept="application/json,.json" hidden>

          <!-- Настройки -->
          <button id="btn-settings" class="btn-noir py-3 md:py-4 px-6 md:px-10 opacity-70">
            <span>03</span> НАСТРОЙКИ <b>↗</b>
          </button>

        </div>

        <!-- Информация о сохранении -->
        ${hasSave
          ? '<p class="text-center ' + (saveBlocked ? 'text-amber-500' : 'text-gray-600') + ' text-xs mt-6" role="status">' + saveInfo + '</p>'
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


      <div class="settings-overlay" id="settings-overlay" hidden aria-hidden="true">
        <section class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1">
          <header class="settings-header">
            <div>
              <p class="settings-kicker">BLACKFORD · ПАРАМЕТРЫ</p>
              <h2 id="settings-title">Настройки</h2>
            </div>
            <button class="settings-close" id="settings-close" type="button" aria-label="Закрыть настройки">×</button>
          </header>
          <p class="settings-intro">Настройте звучание и темп чтения под себя. Изменения сохраняются автоматически.</p>
          <div class="settings-controls">
            <label class="settings-control" for="settings-music">
              <span><strong>Музыка</strong><output id="settings-music-value">${Math.round(settings.musicVolume * 100)}%</output></span>
              <input id="settings-music" type="range" min="0" max="100" step="1" value="${Math.round(settings.musicVolume * 100)}">
              <small>Громкость музыкального сопровождения</small>
            </label>
            <label class="settings-control" for="settings-sfx">
              <span><strong>Звуковые эффекты</strong><output id="settings-sfx-value">${Math.round(settings.sfxVolume * 100)}%</output></span>
              <input id="settings-sfx" type="range" min="0" max="100" step="1" value="${Math.round(settings.sfxVolume * 100)}">
              <small>Громкость интерфейса и игровых сигналов</small>
            </label>
            <label class="settings-control" for="settings-text-speed">
              <span><strong>Скорость текста</strong></span>
              <select id="settings-text-speed">
                <option value="slow" ${settings.textSpeed === 'slow' ? 'selected' : ''}>Медленно</option>
                <option value="normal" ${settings.textSpeed === 'normal' ? 'selected' : ''}>Обычно</option>
                <option value="fast" ${settings.textSpeed === 'fast' ? 'selected' : ''}>Быстро</option>
                <option value="instant" ${settings.textSpeed === 'instant' ? 'selected' : ''}>Мгновенно</option>
              </select>
              <small>Темп появления реплик в диалогах</small>
            </label>
          </div>
          <p class="settings-status" id="settings-status" role="status" aria-live="polite">Настройки будут сохранены на этом устройстве.</p>
          <div class="settings-footer">
            <span>МЁРТВЫЙ ШТИЛЬ · 1.0</span>
            <button class="settings-done" id="settings-done" type="button">ГОТОВО</button>
          </div>
        </section>
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
    Audio.init(GameState.settings);

    // Если есть сохранение — спрашиваем подтверждение
    if (hasSave) {
      var confirmed = confirm('У вас есть сохранение. Начать новую игру? Весь прогресс будет потерян.');
      if (!confirmed) return;
    }

    // === ПОЛНЫЙ СБРОС ВСЕГО ===
    console.log('═══════════════════════════════');
    console.log('🆕 НАЧАЛО НОВОЙ ИГРЫ');
    console.log('═══════════════════════════════');

    // Reset commits the fresh campaign before the old backup is discarded.
    if (!GameState.reset()) {
      alert('Не удалось безопасно создать новую игру. Предыдущее сохранение сохранено; освободите место в хранилище браузера и попробуйте снова.');
      return;
    }
    Audio.init(GameState.settings);

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
    Audio.init(GameState.settings);

    // Загружаем сохранённое состояние
    if (GameState.init() === false) {
      alert('Это сохранение нельзя безопасно открыть в текущей версии. Исходные данные сохранены. Обновите игру до совместимой версии или начните новую игру после подтверждения сброса.');
      return;
    }

    console.log('[Menu] 📂 Загрузка сохранения...');
    console.log('[Menu]    - Память NPC: ' + Object.keys(GameState.npcMemory).length + ' записей');
    console.log('[Menu]    - Улик: ' + GameState.currentCase.clues.length);
    console.log('[Menu]    - Заметок: ' + (GameState.notebook ? GameState.notebook.length : 0));

    // Переходим в кабинет
    Events.emit('navigate', { scene: 'office' });
  });

  // === ЭКСПОРТ / ИМПОРТ СОХРАНЕНИЯ ===
  const exportSaveButton = document.getElementById('btn-export-save');
  const importSaveButton = document.getElementById('btn-import-save');
  const importFileInput = document.getElementById('save-import-file');

  exportSaveButton.addEventListener('click', async function() {
    if (GameState.saveBlocked || !GameState.hasSave()) return;
    try {
      const saveFile = await createSaveFile(GameState.export());
      const blob = new Blob([JSON.stringify(saveFile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dead-calm-save-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Save Transfer] Ошибка экспорта:', error);
      alert('Не удалось экспортировать сохранение. Попробуйте ещё раз.');
    }
  });

  importSaveButton.addEventListener('click', function() {
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async function() {
    const file = importFileInput.files && importFileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер сохранения — 5 МБ.');
      return;
    }

    try {
      const parsed = await parseSaveFile(await file.text());
      if (parsed.status !== 'ok') {
        const reason = parsed.reason === 'checksum-mismatch'
          ? 'Контрольная сумма не совпадает. Файл повреждён или изменён.'
          : parsed.status === 'unsupported'
            ? 'Формат файла создан более новой версией игры.'
            : 'Файл сохранения недействителен или несовместим.';
        alert(reason + ' Текущий прогресс не изменён.');
        return;
      }

      const confirmed = confirm('Импортировать расследование? Текущий прогресс будет заменён. Предыдущее сохранение будет сохранено в резервной копии.');
      if (!confirmed) return;

      if (!GameState.importSave(parsed.data)) {
        alert('Не удалось записать импортированное сохранение. Текущий прогресс не был заменён.');
        return;
      }

      alert('Сохранение успешно импортировано. Игра перезагрузит текущее расследование.');
      window.location.reload();
    } catch (error) {
      console.error('[Save Transfer] Ошибка импорта:', error);
      alert('Не удалось прочитать файл сохранения. Текущий прогресс не изменён.');
    }
  });

  // === НАСТРОЙКИ ===
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsDialog = settingsOverlay.querySelector('.settings-panel');
  const settingsButton = document.getElementById('btn-settings');
  const closeSettingsButton = document.getElementById('settings-close');
  const doneSettingsButton = document.getElementById('settings-done');
  const settingsStatus = document.getElementById('settings-status');

  function closeSettings() {
    if (settingsOverlay.hidden) return;
    GameState.save();
    settingsOverlay.hidden = true;
    settingsOverlay.setAttribute('aria-hidden', 'true');
    settingsButton.focus();
  }

  function openSettings() {
    Audio.init(GameState.settings);
    settingsOverlay.hidden = false;
    settingsOverlay.setAttribute('aria-hidden', 'false');
    closeSettingsButton.focus();
  }

  settingsButton.addEventListener('click', openSettings);
  closeSettingsButton.addEventListener('click', closeSettings);
  doneSettingsButton.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', function(event) {
    if (event.target === settingsOverlay) closeSettings();
  });
  settingsDialog.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(settingsDialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function updateVolume(setting, outputId, value) {
    const normalized = Math.max(0, Math.min(100, Number(value))) / 100;
    GameState.settings[setting] = normalized;
    document.getElementById(outputId).value = Math.round(normalized * 100) + '%';
    if (setting === 'musicVolume') Audio.setMusicVolume(normalized);
    else Audio.setSfxVolume(normalized);
    settingsStatus.textContent = 'Изменения применяются сразу и сохраняются автоматически.';
  }

  const musicControl = document.getElementById('settings-music');
  const sfxControl = document.getElementById('settings-sfx');
  musicControl.addEventListener('input', function() {
    updateVolume('musicVolume', 'settings-music-value', musicControl.value);
  });
  sfxControl.addEventListener('input', function() {
    updateVolume('sfxVolume', 'settings-sfx-value', sfxControl.value);
  });
  musicControl.addEventListener('change', function() { GameState.save(); });
  sfxControl.addEventListener('change', function() { GameState.save(); });

  document.getElementById('settings-text-speed').addEventListener('change', function(event) {
    GameState.settings.textSpeed = event.target.value;
    GameState.save();
    settingsStatus.textContent = 'Скорость текста сохранена.';
  });

}
