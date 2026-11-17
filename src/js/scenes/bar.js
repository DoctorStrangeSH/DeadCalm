import { Events } from '../core/events.js';

export function render(container, data) {
  container.innerHTML = `
    <div class="scene blackford-bar-scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">БАР</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">«Ржавый якорь», портовый район</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="blackford-bar-art" role="img" aria-label="Портовый бар Блэкфорда ночью: деревянная стойка, старый музыкальный автомат и дождь за окнами">
        <div class="blackford-bar-caption"><span>ПОРТОВЫЙ РАЙОН · ПОСЛЕ ПОЛУНОЧИ</span><strong>«Ржавый якорь»</strong></div>
      </div>

      <div class="blackford-bar-description mb-6">
        <p class="text-gray-400 text-sm italic">
          «Ржавый якорь» — не то место, куда заходят случайно. Сюда приходят, когда нужно исчезнуть на пару часов или найти человека,
          которого нет в телефонных справочниках. Бармен — мужик с лицом, напоминающим карту автомобильных аварий —
          протирает стакан и делает вид, что не замечает вас. В углу двое докеров играют в карты на щелбаны.
          Пластинка в музыкальном автомате заела, и уже пять минут Билли Холидей поёт одну и ту же строчку.
        </p>
      </div>

      <div class="space-y-3 mb-6">
        <button id="btn-talk-bartender" class="card blackford-bar-action text-left w-full">
          <p class="card-title">ПОГОВОРИТЬ С БАРМЕНОМ <span aria-hidden="true">↗</span></p>
          <p class="card-subtitle">Бармены слышат всё. Вопрос в том, захотят ли говорить.</p>
        </button>
      </div>

      <div id="bar-result" aria-live="polite"></div>
    </div>
  `;

  container.querySelector('#btn-talk-bartender').addEventListener('click', function() {
    var resultEl = container.querySelector('#bar-result');
    resultEl.innerHTML = `
      <div class="blackford-bar-testimony">
        <p class="blackford-bar-testimony-label">ИЗ ЗАПИСНОЙ КНИЖКИ · БЕСЕДА С БАРМЕНОМ</p>
        <p class="text-gray-300 text-sm leading-relaxed">
          Вы кладёте купюру на стойку. Бармен смотрит на неё, потом на вас. Купюра исчезает в кармане фартука быстрее, чем вы успеваете моргнуть.
        </p>
        <p class="text-gray-400 text-sm mt-3">
          — Судья, значит, — голос у него скрипучий, как несмазанная дверь. — Заходил тут один. Недели две назад.
          Не из наших. Одет чисто, говорил тихо. Спрашивал про старые дела. Двадцать лет. Про девушку, которую нашли в порту.
        </p>
        <p class="text-gray-400 text-sm mt-2">
          Он замолкает и смотрит куда-то сквозь вас.
        </p>
        <p class="text-gray-400 text-sm mt-2">
          — Я ему сказал то же, что и вам: не лезьте в это. В Блэкфорде есть могилы, которые лучше не раскапывать.
          Но он только улыбнулся и сказал... — бармен осёкся. — Сказал, что правосудие слепо, но не глухо.
        </p>
        <p class="text-gray-500 text-xs mt-3">
          Он отходит к другому концу стойки. Разговор окончен.
        </p>
      </div>
    `;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('btn-leave').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'city-map' });
  });
}
