import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { isLocationUnlocked } from '../systems/location-access.js';
import { getNpcPresenceAtLocation } from '../systems/npc-presence.js';

// A city-map scene can be opened repeatedly inside the same persistent container.
// Keep one delegated click listener per container to avoid stale Map instances.
const containerClickHandlers = new WeakMap();

/** Интерактивный атлас Блэкфорда. Открытость локаций задаётся locations.json. */
export class Map {
  constructor(container, locations, characters = {}) {
    this.container = container;
    this.locations = locations;
    this.characters = characters;
    this.selectedLocation = null;
  }

  _isUnlocked(location) {
    return isLocationUnlocked(location, GameState);
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
          <button type="button" class="atlas-directory-item ${this._isUnlocked(loc) ? '' : 'is-locked'}" data-location="${loc.id}">
            <span class="atlas-directory-symbol" aria-hidden="true">${this._isUnlocked(loc) ? '◆' : '×'}</span>
            <span>${loc.name}</span><small>${this._isUnlocked(loc) ? 'ДОСТУПНО' : 'ЗАКРЫТО'}</small>
          </button>
        `).join('')}
      </div>

      <div id="location-info" class="atlas-info mt-4 p-4 min-h-[100px]" aria-live="polite">
        <p class="text-gray-500 text-xs text-center">Выберите локацию на карте или в списке</p>
      </div>
    `;
    const previousHandler = containerClickHandlers.get(this.container);
    if (previousHandler) this.container.removeEventListener('click', previousHandler);

    const handler = event => {
      const button = event.target.closest('[data-location]');
      if (button && this.container.contains(button)) this._selectLocation(button.dataset.location);
    };
    containerClickHandlers.set(this.container, handler);
    this.container.addEventListener('click', handler);
  }

  _renderLocation(loc) {
    // Позиции соответствуют узнаваемым зданиям нарисованного городского атласа.
    const positions = {
      office: [51, 57], morgue: [30, 73], crime_scene_court: [59, 43],
      police_station: [36, 26], bar_rusty_anchor: [43, 48], church: [79, 40],
      blackwood_mansion: [88, 11], holt_house: [51, 16], port: [12, 82]
    };
    const [x, y] = positions[loc.id] || [loc.position?.x ?? 50, loc.position?.y ?? 50];
    return `<button type="button" class="atlas-pin ${this._isUnlocked(loc) ? '' : 'is-locked'}"
      data-location="${loc.id}" style="left:${x}%;top:${y}%" aria-label="${loc.name}${this._isUnlocked(loc) ? '' : ', закрыто'}"
      title="${loc.name}"><span class="atlas-pin-dot">${this._isUnlocked(loc) ? '◆' : '×'}</span><span class="atlas-pin-label">${loc.name}</span></button>`;
  }

  _selectLocation(locId) {
    const loc = this.locations[locId];
    if (!loc) return;
    this.selectedLocation = loc;
    this._highlightLocation(locId);
    const info = this.container.querySelector('#location-info');
    if (!info) return;

    if (!this._isUnlocked(loc)) {
      info.innerHTML = `<div class="atlas-location-detail"><span class="atlas-detail-seal">×</span><div>
        <p class="text-gold">${loc.name}</p><p class="text-gray-400 text-sm mt-1">Закрыто. Откроется позже по сюжету.</p>
      </div></div>`;
      return;
    }

    info.innerHTML = `<div class="atlas-location-detail"><span class="atlas-detail-seal">◆</span><div class="atlas-detail-content">
      <p class="text-gold">${loc.name}</p>
      <p class="text-gray-400 text-sm mt-2">${loc.description}</p>
      ${loc.npc ? (() => {
        const character = this.characters[loc.npc];
        const presence = getNpcPresenceAtLocation(character, loc, GameState);
        const name = character?.name || 'Персонаж';
        const label = presence.available ? 'МОЖНО ВСТРЕТИТЬ' : presence.status === 'not_yet_introduced' ? 'ПОЯВИТСЯ ПОЗЖЕ' : 'НЕТ ПОДТВЕРЖДЁННОГО ПОЯВЛЕНИЯ';
        return '<div class="mt-3 border-l-2 border-gray-700 pl-3"><p class="text-gray-300 text-xs">' +
          name + ' · ' + label + '</p><p class="text-gray-500 text-xs mt-1">' + presence.reason + '</p></div>';
      })() : ''}
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
    if (!this._isUnlocked(loc)) return;
    const scenes = {
      office: 'office', morgue: 'morgue', crime_scene_court: 'crime-scene',
      police_station: 'police-station', bar_rusty_anchor: 'bar', church: 'church',
      blackwood_mansion: 'blackwood-mansion', holt_house: 'holt-house', port: 'port'
    };
    Events.emit('navigate', { scene: scenes[loc.id] || loc.id, data: { location: loc } });
  }
}
