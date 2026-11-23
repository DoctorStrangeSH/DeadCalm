import { Events } from '../core/events.js';

export function renderMiniGameLockScreen(container, title, message) {
  container.innerHTML = `
    <section class="scene minigame-locked-scene">
      <div class="card p-6 md:p-8">
        <p class="office-kicker">BLACKFORD · CASE 001</p>
        <h1 class="text-gold text-xl tracking-widest mt-3">ДОСТУП ПОКА ЗАКРЫТ</h1>
        <h2 class="text-gray-200 text-base mt-5">${title}</h2>
        <p class="text-gray-400 text-sm mt-3">${message}</p>
        <button id="btn-return-office" class="btn-noir w-full py-3 mt-6">ВЕРНУТЬСЯ В КАБИНЕТ</button>
      </div>
    </section>`;
  container.querySelector('#btn-return-office')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}
