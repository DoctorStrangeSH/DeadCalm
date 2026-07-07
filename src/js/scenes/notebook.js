import { Events } from '../core/events.js';
import { NotebookUI } from '../components/notebook-ui.js';
import { Notebook } from '../systems/notebook.js';

export function render(container) {
  var stats = Notebook.getStats();

  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">ДНЕВНИК</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">
            Заметки, улики, наблюдения — всё, что важно для расследования
          </p>
        </div>
        <button id="btn-back" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← В КАБИНЕТ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div id="notebook-container" class="flex-1"></div>
    </div>
  `;

  var notebookContainer = document.getElementById('notebook-container');
  var notebookUI = new NotebookUI(notebookContainer);
  notebookUI.render();

  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}