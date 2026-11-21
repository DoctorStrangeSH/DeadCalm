import { Router } from './router.js';
import { GameState } from './state.js';
import { Events } from './events.js';
import { Audio } from './audio.js';
import { DialogueEngine } from '../systems/dialogue.js';
import { Investigation } from '../systems/investigation.js';

/**
 * Точка входа в приложение.
 * Инициализирует все системы и запускает игру.
 */
async function init() {
  console.log('═══════════════════════════════');
  console.log('🕵️  МЁРТВЫЙ ШТИЛЬ v0.8.0');
  console.log('   Детективный триллер');
  console.log('═══════════════════════════════');

  // 1. Восстанавливаем сохранённое состояние до запуска сцен и систем.
  // Главное меню и все последующие системы должны видеть один и тот же загруженный GameState.
  try {
    GameState.init();
    console.log('[App] Состояние игры восстановлено.');
    console.log('[App] Память NPC: ' + Object.keys(GameState.npcMemory || {}).length);
    console.log('[App] Улики: ' + (GameState.currentCase?.clues?.length || 0));
  } catch (error) {
    console.error('[App] Не удалось восстановить сохранение:', error);
    throw error;
  }

  // Маршрутизатор запускаем только после восстановления GameState.
  Router.init();
  console.log('[App] Ядро инициализировано.');

  // 2. Загружаем систему диалогов
  try {
    await DialogueEngine.init();
    console.log('[App] Система диалогов готова');
  } catch (error) {
    console.error('[App] Ошибка загрузки диалогов:', error);
  }

  // 3. Загружаем систему расследования
  try {
    await Investigation.init();
    console.log('[App] Система расследования готова');
  } catch (error) {
    console.error('[App] Ошибка загрузки расследования:', error);
  }

  // 4. Регистрируем Service Worker для PWA
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[App] Service Worker зарегистрирован');
    } catch (error) {
      console.warn('[App] Service Worker не зарегистрирован:', error);
    }
  }

  // 5. Глобальные слушатели событий
  
  // Изменение состояния
  Events.on('state:changed', function(data) {
    console.log('[State] Изменение: ' + data.key);
  });

  // Добавление улики
  Events.on('clue:added', function(clue) {
    console.log('[Clue] Получена улика: ' + clue.name);
  });

  // Изменение отношений с NPC
  Events.on('relationship:changed', function(data) {
    var emoji = data.delta > 0 ? '👍' : data.delta < 0 ? '👎' : '➡️';
    console.log('[NPC] ' + data.npcId + ': доверие ' + data.trust + '% ' + emoji);
  });

  // Смена сцены и соответствующая музыка/атмосфера.
  Events.on('scene:changed', function(data) {
    Audio.setScene(data.scene);
    if (GameState.campaign?.completed) Audio.playMusic('finale');
    console.log('[Scene] Переход: ' + data.scene);
  });

  // Разблокируем AudioContext только после явного жеста пользователя.
  let audioUnlocked = false;
  const unlockAudio = function() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    Audio.unlock(GameState.settings);
    Audio.setScene(Router.getCurrentScene() || 'main-menu');
  };
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  document.addEventListener('keydown', unlockAudio, { once: true, capture: true });

  // Единые тактильные звуковые сигналы для интерфейса и игровых событий.
  document.addEventListener('click', function(event) {
    if (!event.target.closest('button, [role="button"]')) return;
    const minigameControl = event.target.closest('.radio-range, .film-range, [data-action], #radio-finish, #film-restore, #film-advance');
    Audio.playSfx(minigameControl ? 'minigame-action' : 'ui-click');
  }, true);
  document.addEventListener('input', function(event) {
    if (event.target.matches('input[type="range"]')) Audio.playSfx('ui-adjust');
  }, true);
  Events.on('clue:added', () => Audio.playSfx('clue-found'));
  Events.on('minigame:completed', () => Audio.playSfx('success'));
  Events.on('minigame:failed', () => Audio.playSfx('failure'));
  Events.on('dialogue:opened', () => Audio.playSfx('dialogue-open'));
  Events.on('dialogue:closed', () => Audio.playSfx('dialogue-close'));
  Events.on('campaign:completed', () => Audio.playMusic('finale'));

  // Сброс состояния (новая игра)
  Events.on('state:reset', function() {
    DialogueEngine.reset();
    console.log('[App] ⚠️ Состояние полностью сброшено');
  });

  // Завершение таймлайна
  Events.on('timeline:completed', function(data) {
    console.log('[Timeline] Хронология восстановлена! Счёт: ' + data.score + '%');
  });

  // Завершение мини-игры
  Events.on('minigame:completed', function(data) {
    console.log('[Minigame] Пройдена: ' + data.type);
  });

  Events.on('minigame:failed', function(data) {
    console.log('[Minigame] Провалена: ' + data.type);
  });

  // 6. Обработка видимости страницы (пауза/возобновление)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      Audio.suspend();
      console.log('[App] Игра приостановлена (вкладка неактивна)');
    } else {
      Audio.resume();
      console.log('[App] Игра возобновлена');
    }
  });

  // 7. Обработка свайпов (назад — только на мобилке)
  var touchStartX = 0;
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
  });

  document.addEventListener('touchend', function(e) {
    var touchEndX = e.changedTouches[0].clientX;
    var diff = touchEndX - touchStartX;

    // Свайп вправо > 100px — назад
    if (diff > 100 && Router.getCurrentScene() !== 'main-menu') {
      Events.emit('navigate', { scene: 'office' });
    }
  });

  // 8. Прячем Splash Screen и запускаем игру
  setTimeout(function() {
    var splash = document.getElementById('splash-screen');
    var gameRoot = document.getElementById('game-root');

    if (splash) {
      splash.style.opacity = '0';

      setTimeout(function() {
        splash.remove();

        if (gameRoot) {
          gameRoot.classList.remove('hidden');
          gameRoot.style.opacity = '1';
        }

        // Запускаем главное меню
        Router.goTo('main-menu');
        console.log('[App] Игра запущена');
      }, 1000);
    }
  }, 2000);

  console.log('[App] Инициализация завершена');
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}