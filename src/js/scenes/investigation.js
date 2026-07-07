import { Events } from '../core/events.js';
import { InvestigationBoard } from '../components/investigation-board.js';

export async function render(container) {
  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">РАССЛЕДОВАНИЕ</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Доска улик и связей</p>
        </div>
        <button id="btn-back" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← В КАБИНЕТ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div id="board-container" class="flex-1"></div>
    </div>
  `;

  var boardContainer = document.getElementById('board-container');
  var board = new InvestigationBoard(boardContainer);
  await board.render();

  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}