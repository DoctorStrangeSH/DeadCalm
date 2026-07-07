import { Minigames } from '../systems/minigames.js';
import { Events } from '../core/events.js';

export function render(container) {
  container.innerHTML = `
    <div class="scene">
      <div class="scene-header mb-4">
        <h2 class="text-gold text-lg tracking-widest">ТЕСТ МИНИ-ИГР</h2>
        <button id="btn-back" class="text-gray-400 hover:text-gold transition text-sm">← НАЗАД</button>
      </div>
      <div class="divider mb-4"></div>
      <div class="space-y-3">
        <button id="btn-lockpick" class="btn-noir">🔐 ВЗЛОМ ЗАМКА</button>
        <button id="btn-cipher" class="btn-noir">🔐 РАСШИФРОВКА</button>
        <button id="btn-fingerprints" class="btn-noir">🔬 ОТПЕЧАТКИ</button>
      </div>
      <div id="minigame-result" class="mt-4 text-sm"></div>
    </div>
  `;

  function showResult(text, color) {
    document.getElementById('minigame-result').innerHTML = '<p class="text-' + color + '">' + text + '</p>';
  }

  document.getElementById('btn-lockpick').addEventListener('click', function() {
    Minigames.start('lockpick', { pins: 4, attempts: 3 })
      .then(function(r) { showResult('✅ ' + r.message, 'green-400'); })
      .catch(function(e) { showResult('❌ ' + e, 'red-400'); });
  });

  document.getElementById('btn-cipher').addEventListener('click', function() {
    Minigames.start('cipher', { message: 'КЛЮЧ ПОД КОВРОМ', attempts: 5 })
      .then(function(r) { showResult('✅ ' + r.message, 'green-400'); })
      .catch(function(e) { showResult('❌ ' + e, 'red-400'); });
  });

  document.getElementById('btn-fingerprints').addEventListener('click', function() {
    Minigames.start('fingerprints', {})
      .then(function(r) { showResult('✅ Качество: ' + r.quality + '%', 'green-400'); })
      .catch(function(e) { showResult('❌ ' + e, 'red-400'); });
  });

  document.getElementById('btn-back').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'office' });
  });
}