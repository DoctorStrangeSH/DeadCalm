import { Events } from '../core/events.js';
import { Timeline } from '../systems/timeline.js';
import { TimelineUI } from '../components/timeline-ui.js';

export async function render(container) {
  await Timeline.init();

  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">ХРОНОЛОГИЯ</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Восстановите последовательность событий</p>
        </div>
        <button id="btn-back" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← В КАБИНЕТ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div id="timeline-container" class="flex-1 overflow-y-auto"></div>
    </div>
  `;

  var timelineContainer = document.getElementById('timeline-container');
  var timelineUI = new TimelineUI(timelineContainer);
  timelineUI.render();

  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}