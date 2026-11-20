import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Map } from '../components/map.js';
import { showNotification } from '../utils/helpers.js';

/**
 * Сцена: Карта города Блэкфорд.
 * Игрок выбирает, куда отправиться.
 */
export async function render(container) {
  // Загружаем данные локаций
  var locations = {};
  try {
    var response = await fetch('src/data/locations.json');
    if (!response.ok) throw new Error('Ошибка загрузки');
    locations = await response.json();
    console.log('[CityMap] Локации загружены: ' + Object.keys(locations).length);
  } catch (error) {
    console.error('[CityMap] Ошибка загрузки локаций:', error);
    showNotification('Ошибка загрузки карты');
    locations = {};
  }

  container.innerHTML = `
    <div class="scene blackford-map-scene">
      <!-- Шапка -->
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">БЛЭКФОРД</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Карта города — День ${GameState.campaign?.day || 1}</p>
        </div>
        <button id="btn-back" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← В КАБИНЕТ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <!-- Контейнер карты -->
      <div id="map-container" class="flex-1"></div>

      <!-- Подсказка -->
      <p class="text-gray-500 text-xs mt-4 text-center">
        Выберите отметку на карте или локацию из списка, затем «ОТПРАВИТЬСЯ»
      </p>
    </div>
  `;

  // Создаём и отрисовываем карту
  var mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    var map = new Map(mapContainer, locations);
    map.render();
  }

  // Кнопка «Назад»
  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}
