import { Events } from '../core/events.js';
import { DialogBox } from '../components/dialog-box.js';

/**
 * Сцена: Морг Блэкфорда.
 * Игрок встречает доктора Лидию Винтер и может допросить её.
 */
export function render(container) {
  container.innerHTML = `
    <div class="scene morgue-scene">
      <!-- Шапка -->
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">МОРГ</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Подвал городской больницы, 03:47</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="morgue-art" role="img" aria-label="Ночной морг: кафель, металлические столы, медицинские документы и тело под простынёй">
        <div class="morgue-art-caption"><span>ГОРОДСКАЯ БОЛЬНИЦА · 03:47</span><strong>Тишина подвала</strong></div>
      </div>

      <!-- Описание локации -->
      <p class="morgue-description mb-6">
        Холодный воздух пахнет формалином и чем-то сладким. Под лампами дневного света — три стола.
        На одном из них — тело судьи, прикрытое простынёй.
        Доктор Лидия Винтер стоит у раковины, молча моет инструменты.
      </p>

      <!-- Контейнер для диалога -->
      <div id="dialog-container" class="hidden" aria-live="polite"></div>

      <!-- Кнопка начала разговора (если диалог не активен) -->
      <button id="btn-start-talk" class="morgue-action mt-4">
        <span>ЗАГОВОРИТЬ С ДОКТОРОМ ВИНТЕР</span><span aria-hidden="true">↗</span>
      </button>
    </div>
  `;

  const dialogContainer = document.getElementById('dialog-container');
  const btnStartTalk = document.getElementById('btn-start-talk');
  const btnLeave = document.getElementById('btn-leave');

  // Обработчик: начать разговор
  btnStartTalk.addEventListener('click', async () => {
    btnStartTalk.classList.add('hidden');
    dialogContainer.classList.remove('hidden');

    const dialogBox = new DialogBox();
    await dialogBox.show('npc_lydia_winter');

    // После завершения диалога
    Events.once('dialogue:closed', () => {
      dialogContainer.innerHTML = `
        <p class="text-gray-500 text-sm italic">Лидия возвращается к работе. Кажется, разговор окончен.</p>
      `;
      btnStartTalk.querySelector('span:first-child').textContent = 'ЗАГОВОРИТЬ СНОВА';
      btnStartTalk.classList.remove('hidden');
    });
  });

  // Обработчик: уйти
  btnLeave.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'office' });
  });
}
