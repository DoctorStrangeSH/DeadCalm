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
      <div class="map-container atlas-frame relative w-full">
        <div class="atlas-caption"><span>АРХИВ ПОЛИЦИИ БЛЭКФОРДА</span><span>СЕКРЕТНО · 1987</span></div>
        <!-- SVG-карта -->
        <svg class="atlas-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Интерактивная карта Блэкфорда">
          <defs>
            <pattern id="atlas-grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M5 0L0 5" stroke="#ac9b7c" stroke-width=".07"/></pattern>
            <pattern id="atlas-water" width="8" height="5" patternUnits="userSpaceOnUse"><path d="M0 2Q2 1 4 2T8 2" stroke="#8fa09c" stroke-width=".15" fill="none"/></pattern>
          </defs>
          <!-- Фон -->
          <rect width="100" height="100" fill="#c5b89b" />
          <rect width="100" height="100" fill="url(#atlas-grain)" />
          <path d="M0 0H25Q18 12 22 24T14 49Q21 61 14 72T23 100H0Z" fill="#738f92" opacity=".8"/>
          <path d="M0 0H25Q18 12 22 24T14 49Q21 61 14 72T23 100H0Z" fill="url(#atlas-water)" />
          <path d="M25 0Q18 12 22 24T14 49Q21 61 14 72T23 100" fill="none" stroke="#eee1bd" stroke-width="1.1"/>

          <!-- Сетка улиц -->
          ${this._renderGrid()}
          <g fill="#826f56" opacity=".6" font-size="2.2" font-family="Georgia" letter-spacing=".2">
            <text x="2" y="30" transform="rotate(-90 2 30)">ЗАЛИВ БЛЭКФОРД</text>
            <text x="73" y="69">СТАРЫЙ ГОРОД</text><text x="47" y="12">СЕВЕРНЫЙ ХОЛМ</text>
            <text x="27" y="92">ПОРТОВЫЙ КВАРТАЛ</text>
          </g>
          <g stroke="#8d7d61" stroke-width=".25" opacity=".6" fill="#b0a181">
            <path d="M27 10h13v9H27zM46 7h14v12H46zM68 10h11v12H68zM83 24h11v14H83zM29 34h11v11H29zM80 44h14v15H80zM36 72h12v12H36zM64 78h17v9H64z" />
          </g>
          <g stroke="#f0e4c6" stroke-width="1.9" opacity=".7" fill="none" stroke-linecap="round">
            <path d="M26 5L33 28L50 50L70 40L92 22M26 80L30 65L50 50L60 55L82 77M40 20L55 30L70 40L90 58M20 80L50 50"/>
          </g>
          <g stroke="#796b54" stroke-width=".23" fill="none" stroke-dasharray="1 1" opacity=".6"><path d="M26 5L33 28L50 50L70 40L92 22M26 80L30 65L50 50L60 55L82 77M40 20L55 30L70 40L90 58"/></g>

          <!-- Локации -->
          ${allLocations.map(loc => this._renderLocation(loc)).join('')}
        </svg>
        <div class="atlas-footer"><span>СЕВЕР ↑</span><span>МАСШТАБ 1:12 000</span><span>BLACKFORD COUNTY</span></div>
      </div>

      <!-- Информация о выбранной локации -->
      <div id="location-info" class="atlas-info mt-4 p-4 min-h-[100px]">
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
    for (let i = 10; i < 100; i += 10) {
      grid += `<line x1="${i}" y1="0" x2="${i}" y2="100" stroke="#796f5b" stroke-width="0.09" opacity=".4" />`;
      grid += `<line x1="0" y1="${i}" x2="100" y2="${i}" stroke="#796f5b" stroke-width="0.09" opacity=".4" />`;
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
        <circle cx="${x}" cy="${y}" r="4.1"
                fill="${isLocked ? '#908774' : '#243d43'}"
                stroke="${isLocked ? '#776e5f' : '#efe0b8'}"
                stroke-width=".7"
                class="location-circle" />

        <!-- Иконка -->
        <text x="${x}" y="${y + 0.5}"
              text-anchor="middle"
              fill="#f2dfb3"
              font-size="2.7"
              class="location-icon">${isLocked ? '✕' : this._symbolFor(loc.id)}</text>

        <!-- Название -->
        <text x="${x}" y="${y + 6}"
              text-anchor="middle"
              fill="${isLocked ? '#716758' : '#332b23'}"
              font-size="2.25"
              font-family="Georgia"
              font-weight="bold" paint-order="stroke" stroke="#c5b89b" stroke-width=".55"
              class="location-name">${loc.name}</text>

        <!-- Замок для закрытых -->
      </g>
    `;
  }

  _symbolFor(id) {
    const symbols = { office: '⌂', morgue: '✚', crime_scene_court: '⚖', police_station: '★', bar_rusty_anchor: '⚓', church: '✝', blackwood_mansion: '◆', holt_house: '⌂', port: '⚓' };
    return symbols[id] || '●';
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

    // Синтетический click уже обрабатывает касания: исключаем двойной вызов.
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
      const locked = !this.locations[circle.closest('[data-location]').dataset.location]?.unlocked;
      circle.setAttribute('stroke', locked ? '#776e5f' : '#efe0b8');
      circle.setAttribute('stroke-width', '0.7');
    });

    // Подсвечиваем выбранную
    const selectedEl = this.container.querySelector(`[data-location="${locId}"]`);
    if (selectedEl) {
      const circle = selectedEl.querySelector('.location-circle');
      if (circle) {
        circle.setAttribute('stroke', '#a73f35');
        circle.setAttribute('stroke-width', '1.3');
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
