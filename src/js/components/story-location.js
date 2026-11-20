import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { DialogBox } from './dialog-box.js';

/** Shared presentation for authored locations in case 001. */
export function renderStoryLocation(container, config) {
  const {
    title, subtitle, description, npcId = null,
    background = null, action = null
  } = config;

  const image = background
    ? `<img class="story-location-image" src="src/assets/backgrounds/${background}" alt="" loading="eager">`
    : '';

  container.innerHTML = `
    <div class="scene story-location-scene">
      <header class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">${title}</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">${subtitle}</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">← УЙТИ</button>
      </header>
      <div class="divider mb-4 md:mb-6"></div>
      ${image ? `<div class="story-location-art">${image}</div>` : ''}
      <p class="story-location-description text-gray-300 text-sm leading-relaxed mb-6">${description}</p>
      <div class="story-location-actions space-y-3">
        ${npcId ? '<button id="btn-talk" class="btn-noir w-full py-3">ПОГОВОРИТЬ ↗</button>' : ''}
        ${action ? `<button id="btn-story-action" class="card text-left w-full"><p class="card-title">${action.label}</p><p class="card-subtitle">${action.description}</p></button>` : ''}
      </div>
      <div id="story-location-result" class="mt-4" aria-live="polite"></div>
    </div>
  `;

  container.querySelector('#btn-leave')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'city-map' });
  });

  container.querySelector('#btn-talk')?.addEventListener('click', async () => {
    const dialog = new DialogBox();
    await dialog.show(npcId);
  });

  container.querySelector('#btn-story-action')?.addEventListener('click', () => {
    if (!action?.clueId) return;
    const clue = action.clueId;
    if (GameState.hasClue(clue)) {
      container.querySelector('#story-location-result').textContent = 'Эта запись уже сохранена в материалах дела.';
      return;
    }
    if (action.requiresDay && GameState.campaign.day < action.requiresDay) return;
    const catalog = action.clue;
    if (!catalog) return;
    GameState.addClue(catalog);
    container.querySelector('#story-location-result').textContent = 'Материал добавлен в дело.';
  });
}
