import { Events } from '../core/events.js';
import { DialogueEngine } from '../systems/dialogue.js';
import { DialogBox } from '../components/dialog-box.js';

export function render(container, data) {
  const location = data?.location || { name: 'Полицейский участок' };

  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">УЧАСТОК</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">Центральный участок Блэкфорда</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="bg-noir-950 border border-noir-700 p-4 mb-6">
        <p class="text-gray-400 text-sm italic">
          В участке пахнет дешёвым растворимым кофе и застарелым табачным дымом — той особой смесью, которая въедается в стены всех полицейских участков мира. 
          За обшарпанной стойкой дежурный лениво листает газету трёхдневной давности, делая вид, что не замечает вас. 
          Где-то в глубине коридора слышен приглушённый крик — кого-то допрашивают, и, судя по тону, допрашиваемый проигрывает.
        </p>
        <p class="text-gray-500 text-xs mt-3">
          Детектив Рэй Морган сидит за столом в дальнем углу. Перед ним — гора папок, пепельница, полная окурков, и кружка с надписью «Лучший папа», происхождение которой вызывает вопросы.
        </p>
      </div>

      <div class="space-y-3 mb-6">
        <button id="btn-talk-ray" class="card text-left w-full">
          <p class="card-title">👤 ПОГОВОРИТЬ С ДЕТЕКТИВОМ МОРГАНОМ</p>
          <p class="card-subtitle">Расспросить о деле. Если он, конечно, в настроении.</p>
        </button>
      </div>

      <div id="dialog-container" class="hidden"></div>
    </div>
  `;

  document.getElementById('btn-talk-ray').addEventListener('click', async function() {
    document.querySelector('.space-y-3').classList.add('hidden');
    var dialogContainer = document.getElementById('dialog-container');
    dialogContainer.classList.remove('hidden');

    var dialogBox = new DialogBox(dialogContainer);
    await dialogBox.show('npc_ray_morgan');

    Events.once('dialogue:closed', function() {
      dialogContainer.innerHTML = '<p class="text-gray-500 text-sm italic">Рэй закуривает очередную сигарету и отворачивается к окну. Аудиенция окончена.</p>';
      document.querySelector('.space-y-3').classList.remove('hidden');
    });
  });

  document.getElementById('btn-leave').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'city-map' });
  });
}