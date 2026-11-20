import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { Audio } from '../core/audio.js';
import { normalizeSettings } from '../systems/settings.js';

function volumeRow(id, title, description, value) {
  return `
    <label class="settings-control" for="${id}">
      <span class="settings-control-copy">
        <span class="settings-control-title">${title}</span>
        <span class="settings-control-description">${description}</span>
      </span>
      <span class="settings-range-wrap">
        <input id="${id}" class="settings-range" type="range" min="0" max="1" step="0.01" value="${value}" aria-label="${title}">
        <output id="${id}-value" for="${id}">${Math.round(value * 100)}%</output>
      </span>
    </label>
  `;
}

export function render(container) {
  GameState.settings = normalizeSettings(GameState.settings);
  Audio.init(GameState.settings);
  Audio.applySettings(GameState.settings);

  container.innerHTML = `
    <section class="scene settings-scene flex items-center justify-center px-4 py-8">
      <div class="settings-panel w-full max-w-2xl">
        <p class="settings-eyebrow">BLACKFORD · ПАРАМЕТРЫ СИСТЕМЫ</p>
        <h1 class="settings-heading">НАСТРОЙКИ</h1>
        <p class="settings-intro">Настройте звучание и темп расследования. Изменения сохраняются автоматически.</p>

        <section class="settings-section" aria-labelledby="settings-audio-heading">
          <h2 id="settings-audio-heading" class="settings-section-title">ЗВУК</h2>
          <p class="settings-audio-note">Уровни громкости сохраняются. Музыкальные дорожки и звуковые эффекты пока не подключены к этой сборке.</p>
          ${volumeRow('settings-music', 'Громкость музыки', 'Уровень фонового музыкального сопровождения', GameState.settings.musicVolume)}
          ${volumeRow('settings-sfx', 'Громкость эффектов', 'Уровень звуков интерфейса и игровых событий', GameState.settings.sfxVolume)}
        </section>

        <section class="settings-section" aria-labelledby="settings-dialogue-heading">
          <h2 id="settings-dialogue-heading" class="settings-section-title">ТЕКСТ И ДИАЛОГИ</h2>
          <label class="settings-control" for="settings-text-speed">
            <span class="settings-control-copy">
              <span class="settings-control-title">Скорость появления текста</span>
              <span class="settings-control-description">Темп, с которым печатаются реплики персонажей</span>
            </span>
            <select id="settings-text-speed" class="settings-select">
              <option value="slow" ${GameState.settings.textSpeed === 'slow' ? 'selected' : ''}>Медленно</option>
              <option value="normal" ${GameState.settings.textSpeed === 'normal' ? 'selected' : ''}>Обычно</option>
              <option value="fast" ${GameState.settings.textSpeed === 'fast' ? 'selected' : ''}>Быстро</option>
            </select>
          </label>
        </section>

        <div class="settings-footer">
          <span id="settings-save-status" role="status" aria-live="polite">Все изменения сохраняются автоматически</span>
          <button id="settings-back" class="btn-noir settings-back">← В ГЛАВНОЕ МЕНЮ</button>
        </div>
      </div>
    </section>
  `;

  const save = () => {
    GameState.save();
    const status = container.querySelector('#settings-save-status');
    if (status) status.textContent = GameState.saveStatus === 'valid'
      ? 'Настройки сохранены'
      : 'Не удалось сохранить настройки в браузере';
  };

  const music = container.querySelector('#settings-music');
  const musicValue = container.querySelector('#settings-music-value');
  music.addEventListener('input', () => {
    const value = Number(music.value);
    GameState.settings.musicVolume = value;
    musicValue.value = Math.round(value * 100) + '%';
    musicValue.textContent = musicValue.value;
    Audio.setMusicVolume(value);
    save();
  });

  const sfx = container.querySelector('#settings-sfx');
  const sfxValue = container.querySelector('#settings-sfx-value');
  sfx.addEventListener('input', () => {
    const value = Number(sfx.value);
    GameState.settings.sfxVolume = value;
    sfxValue.value = Math.round(value * 100) + '%';
    sfxValue.textContent = sfxValue.value;
    Audio.setSfxVolume(value);
    save();
  });

  container.querySelector('#settings-text-speed').addEventListener('change', event => {
    GameState.settings.textSpeed = event.target.value;
    save();
  });

  container.querySelector('#settings-back').addEventListener('click', () => {
    Events.emit('navigate', { scene: 'main-menu' });
  });
}
