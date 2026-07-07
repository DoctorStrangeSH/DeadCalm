import { Events } from '../core/events.js';
import { Minigames } from '../systems/minigames.js';
import { GameState } from '../core/state.js';

/**
 * Сюжетная сцена с погоней.
 * Вызывается в ключевой момент расследования.
 */
export function render(container) {
  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <h2 class="text-gold text-lg tracking-widest">ПОГОНЯ</h2>
        <p class="text-gray-500 text-xs tracking-wider mt-1">Порт, полночь</p>
      </div>
      <div class="divider mb-4"></div>

      <div class="bg-noir-950 border border-noir-700 p-4 mb-6">
        <p class="text-gray-400 text-sm italic">
          Вы замечаете тень, метнувшуюся между контейнерами. Это он — человек в тёмном пальто, 
          тот самый, кого вы видели на записи с камер наблюдения. Он замечает вас и бросается бежать.
        </p>
        <p class="text-gray-400 text-sm italic mt-2">
          Время замедляется. Вы слышите только стук своего сердца и звук шагов по мокрому асфальту. 
          Начинается погоня.
        </p>
      </div>

      <div id="chase-result" class="mb-4"></div>

      <button id="btn-start-chase" class="btn-noir text-base py-4">
        🏃 НАЧАТЬ ПОГОНЮ
      </button>
      <button id="btn-back" class="text-gray-600 text-xs tracking-widest mt-4 hover:text-gray-400 transition">
        ← ОТСТУПИТЬ
      </button>
    </div>
  `;

  document.getElementById('btn-start-chase').addEventListener('click', function() {
    document.getElementById('btn-start-chase').classList.add('hidden');

    Minigames.start('chase', {
      phases: 3,
      speed: 2.5,
      targetDistance: 80
    })
    .then(function(result) {
      var resultEl = document.getElementById('chase-result');
      resultEl.innerHTML = `
        <div class="bg-green-900/30 border border-green-700 p-4">
          <p class="text-green-400 text-sm">✅ Подозреваемый пойман!</p>
          <p class="text-green-300 text-xs mt-1">Дистанция: ${Math.floor(result.distance)}м | Захват: успешно</p>
        </div>
      `;
      document.getElementById('btn-start-chase').classList.add('hidden');
      document.getElementById('btn-back').textContent = '← ВЕРНУТЬСЯ В КАБИНЕТ';

      // Сохраняем прогресс
      GameState.setFlag('suspect_caught');
      GameState.addClue({
        id: 'chase_result',
        name: 'Задержанный подозреваемый',
        category: 'important',
        description: 'В порту был задержан подозреваемый. При нём найдены документы, связывающие его с Блэквудом.',
        location: 'port',
        day: 2
      });
    })
    .catch(function(error) {
      var resultEl = document.getElementById('chase-result');
      resultEl.innerHTML = `
        <div class="bg-red-900/30 border border-red-700 p-4">
          <p class="text-red-400 text-sm">💀 Подозреваемый скрылся</p>
          <p class="text-red-300 text-xs mt-1">${error}</p>
        </div>
      `;
      document.getElementById('btn-start-chase').classList.remove('hidden');
      document.getElementById('btn-start-chase').textContent = '🔄 ПОПРОБОВАТЬ СНОВА';
    });
  });

  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}