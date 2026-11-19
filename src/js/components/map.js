import { Events } from '../core/events.js';

/** Интерактивный атлас Блэкфорда. Открытость локаций задаётся locations.json. */
export class Map {
  constructor(container, locations) {
    this.container = container;
    this.locations = locations;
    this.selectedLocation = null;
  }

  render() {
    const locations = Object.values(this.locations);
    this.container.innerHTML = `
      <div class="map-container atlas-frame blackford-atlas">
        <div class="atlas-caption"><span>АРХИВ ПОЛИЦИИ БЛЭКФОРДА</span><span>СЕКРЕТНО · 1987</span></div>
        <div class="atlas-painting">
          <img src="src/assets/backgrounds/blackford-city-atlas.webp" alt="Вид на дождливый Блэкфорд сверху: порт, больница, площадь суда, церковь и особняк на северном холме" />
          <div class="atlas-pins" aria-label="Локации города">
            ${locations.map(loc => this._renderLocation(loc)).join('')}
          </div>
        </div>
        <div class="atlas-footer"><span>СЕВЕР ↑</span><span>НОЯБРЬ 1987</span><span>BLACKFORD COUNTY</span></div>
      </div>

      <div class="atlas-directory" aria-label="Список локаций">
        ${locations.map(loc => `
          <button type="button" class="atlas-directory-item ${loc.unlocked ? '' : 'is-locked'}" data-location="${loc.id}">
            <span class="atlas-directory-symbol" aria-hidden="true">${loc.unlocked ? '◆' : '×'}</span>
            <span>${loc.name}</span><small>${loc.unlocked ? 'ДОСТУПНО' : 'ЗАКРЫТО'}</small>
          </button>
        `).join('')}
      </div>

      <div id="location-info" class="atlas-info mt-4 p-4 min-h-[100px]" aria-live="polite">
        <p class="text-gray-500 text-xs text-center">Выберите локацию на карте или в списке</p>
      </div>
    `;
    this.container.addEventListener('click', event => {
      const button = event.target.closest('[data-location]');
      if (button && this.container.contains(button)) this._selectLocation(button.dataset.location);
    });
  }

  _renderLocation(loc) {
    // Позиции соответствуют узнаваемым зданиям нарисованного городского атласа.
    const positions = {
      office: [51, 57], morgue: [30, 73], crime_scene_court: [59, 43],
      police_station: [36, 26], bar_rusty_anchor: [43, 48], church: [79, 40],
      blackwood_mansion: [88, 11], holt_house: [51, 16], port: [12, 82]
    };
    const [x, y] = positions[loc.id] || [loc.position?.x ?? 50, loc.position?.y ?? 50];
    return `<button type="button" class="atlas-pin ${loc.unlocked ? '' : 'is-locked'}"
      data-location="${loc.id}" style="left:${x}%;top:${y}%" aria-label="${loc.name}${loc.unlocked ? '' : ', закрыто'}"
      title="${loc.name}"><span class="atlas-pin-dot">${loc.unlocked ? '◆' : '×'}</span><span class="atlas-pin-label">${loc.name}</span></button>`;
  }

  _selectLocation(locId) {
    const loc = this.locations[locId];
    if (!loc) return;
    this.selectedLocation = loc;
    this._highlightLocation(locId);
    const info = this.container.querySelector('#location-info');
    if (!info) return;

    if (!loc.unlocked) {
      info.innerHTML = `<div class="atlas-location-detail"><span class="atlas-detail-seal">×</span><div>
        <p class="text-gold">${loc.name}</p><p class="text-gray-400 text-sm mt-1">Закрыто. Откроется позже по сюжету.</p>
      </div></div>`;
      return;
    }

    info.innerHTML = `<div class="atlas-location-detail"><span class="atlas-detail-seal">◆</span><div class="atlas-detail-content">
      <p class="text-gold">${loc.name}</p>
      <p class="text-gray-400 text-sm mt-2">${loc.description}</p>
      ${loc.npc ? '<p class="text-gray-500 text-xs mt-2">Здесь можно поговорить с персонажем</p>' : ''}
      <button id="btn-go-location" class="btn-noir text-xs py-2 mt-4 w-full">ОТПРАВИТЬСЯ →</button>
    </div></div>`;
    info.querySelector('#btn-go-location').addEventListener('click', () => this._goToLocation(loc));
  }

  _highlightLocation(locId) {
    this.container.querySelectorAll('[data-location]').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.location === locId);
    });
  }

  _goToLocation(loc) {
    if (!loc.unlocked) return;
    const scenes = {
      office: 'office', morgue: 'morgue', crime_scene_court: 'crime-scene',
      police_station: 'police-station', bar_rusty_anchor: 'bar', church: 'church',
      blackwood_mansion: 'blackwood-mansion', holt_house: 'holt-house', port: 'port'
    };
    Events.emit('navigate', { scene: scenes[loc.id] || loc.id, data: { location: loc } });
  }
}
