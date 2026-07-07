import { Events } from '../core/events.js';

/**
 * UI-компонент карты города.
 * Отображает локации и обрабатывает клики по ним.
 */
export class Map {
  constructor(container, locations) {
    this.container = container;
    this.locations = locations;
    this.selectedLocation = null;
  }

  /**
   * Отрисовать карту
   */
  render() {
    // Сортируем: открытые сверху
    const unlocked = Object.values(this.locations).filter(l => l.unlocked);
    const locked = Object.values(this.locations).filter(l => !l.unlocked);
    const allLocations = [...unlocked, ...locked];

    this.container.innerHTML = `
      <div class="map-container relative w-full" style="padding-bottom: 100%;">
        <!-- SVG-карта -->
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <!-- Фон -->
          <rect width="100" height="100" fill="#0a0a0a" rx="2" />
          
          <!-- Сетка улиц -->
          ${this._renderGrid()}
          
          <!-- Река/порт -->
          <path d="M0 55 Q10 50, 20 55 Q30 60, 40 55" stroke="#1a3a3a" stroke-width="0.5" fill="none" />
          <text x="5" y="58" fill="#1a3a3a" font-size="2" font-family="Georgia">ПОРТ</text>
          
          <!-- Локации -->
          ${allLocations.map(loc => this._renderLocation(loc)).join('')}
        </svg>
      </div>
      
      <!-- Информация о выбранной локации -->
      <div id="location-info" class="mt-4 p-3 bg-noir-950 border border-noir-600 min-h-[100px]">
        <p class="text-gray-500 text-xs text-center">Выберите локацию на карте</p>
      </div>
    `;

    // Добавляем обработчики кликов
    this._addClickHandlers();
  }

  /**
   * Сетка улиц
   */
  _renderGrid() {
    let grid = '';
    for (let i = 20; i < 100; i += 20) {
      grid += `<line x1="${i}" y1="0" x2="${i}" y2="100" stroke="#1a1a1a" stroke-width="0.3" />`;
      grid += `<line x1="0" y1="${i}" x2="100" y2="${i}" stroke="#1a1a1a" stroke-width="0.3" />`;
    }
    return grid;
  }

  /**
   * Отрисовать одну локацию на SVG
   */
  _renderLocation(loc) {
    const x = loc.position.x;
    const y = loc.position.y;
    const isLocked = !loc.unlocked;
    
    return `
      <g class="map-location" data-location="${loc.id}" 
         style="cursor: pointer; transition: transform 0.2s;">
        <!-- Подсветка -->
        <circle cx="${x}" cy="${y}" r="4" 
                fill="${isLocked ? '#111' : '#1a1a1a'}" 
                stroke="${isLocked ? '#333' : '#c5a572'}" 
                stroke-width="${isLocked ? '0.3' : '0.6'}"
                class="location-circle" />
        
        <!-- Иконка -->
        <text x="${x}" y="${y + 0.5}" 
              text-anchor="middle" 
              fill="${isLocked ? '#555' : '#c5a572'}" 
              font-size="2.5"
              class="location-icon">${loc.icon}</text>
        
        <!-- Название -->
        <text x="${x}" y="${y + 6}" 
              text-anchor="middle" 
              fill="${isLocked ? '#555' : '#888'}" 
              font-size="2"
              font-family="Georgia"
              class="location-name">${loc.name}</text>
        
        <!-- Замок для закрытых -->
        ${isLocked ? `
        <text x="${x}" y="${y - 4.5}" 
              text-anchor="middle" 
              fill="#555" 
              font-size="2">🔒</text>
        ` : ''}
      </g>
    `;
  }

  /**
   * Добавить обработчики кликов
   */
  _addClickHandlers() {
    // Используем делегирование событий на контейнере SVG
    const svg = this.container.querySelector('svg');
    if (!svg) return;

    svg.addEventListener('click', (event) => {
      // Ищем ближайший элемент локации
      const locationEl = event.target.closest('.map-location');
      if (locationEl) {
        const locId = locationEl.getAttribute('data-location');
        this._selectLocation(locId);
      }
    });

    // Для мобильных — также touch события
    svg.addEventListener('touchend', (event) => {
      const locationEl = event.target.closest('.map-location');
      if (locationEl) {
        const locId = locationEl.getAttribute('data-location');
        this._selectLocation(locId);
      }
    });
  }

  /**
   * Выбрать локацию
   */
  _selectLocation(locId) {
    const loc = this.locations[locId];
    if (!loc) return;

    this.selectedLocation = loc;
    const infoEl = document.getElementById('location-info');

    if (!infoEl) {
      console.error('[Map] Элемент #location-info не найден');
      return;
    }

    // Подсвечиваем выбранную локацию на карте
    this._highlightLocation(locId);

    if (!loc.unlocked) {
      // Закрытая локация
      infoEl.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔒</span>
          <div>
            <p class="text-gray-500 text-sm">${loc.name}</p>
            <p class="text-gray-600 text-xs mt-1">Закрыто. Откроется позже по сюжету.</p>
          </div>
        </div>
      `;
      return;
    }

    // Открытая локация
    const npcInfo = loc.npc ? `<p class="text-gray-500 text-xs mt-2">👤 Здесь можно поговорить с персонажем</p>` : '';
    
    infoEl.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl">${loc.icon}</span>
        <div class="flex-1">
          <p class="text-gold text-sm tracking-wider">${loc.name}</p>
          <p class="text-gray-400 text-xs mt-1">${loc.description}</p>
          ${npcInfo}
          <button id="btn-go-location" class="btn-noir text-xs py-2 mt-3 w-full">
            ОТПРАВИТЬСЯ
          </button>
        </div>
      </div>
    `;

    // Добавляем обработчик на кнопку
    const btnGo = document.getElementById('btn-go-location');
    if (btnGo) {
      btnGo.addEventListener('click', () => {
        this._goToLocation(loc);
      });
    }
  }

  /**
   * Подсветить выбранную локацию на SVG
   */
  _highlightLocation(locId) {
    // Сбрасываем все подсветки
    this.container.querySelectorAll('.location-circle').forEach(circle => {
      circle.setAttribute('stroke', '#1a1a1a');
      circle.setAttribute('stroke-width', '0.3');
    });

    // Подсвечиваем выбранную
    const selectedEl = this.container.querySelector(`[data-location="${locId}"]`);
    if (selectedEl) {
      const circle = selectedEl.querySelector('.location-circle');
      if (circle) {
        circle.setAttribute('stroke', '#c5a572');
        circle.setAttribute('stroke-width', '0.8');
      }
    }
  }

  /**
   * Перейти на локацию
   */
  _goToLocation(loc) {
    // Маппинг ID локации на имя сцены
    const sceneMap = {
      'office': 'office',
      'morgue': 'morgue',
      'crime_scene_court': 'crime-scene',
      'police_station': 'police-station',
      'bar_rusty_anchor': 'bar',
      'church': 'church',
      'blackwood_mansion': 'blackwood-mansion',
      'holt_house': 'holt-house',
      'port': 'port'
    };

    const sceneName = sceneMap[loc.id] || loc.id;
    console.log(`[Map] Переход на локацию: ${loc.name} → ${sceneName}`);
    Events.emit('navigate', { scene: sceneName, data: { location: loc } });
  }
}