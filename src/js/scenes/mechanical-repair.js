import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { recordCase001MiniGameEvidence } from '../systems/case-001-evidence.js';
import { createRepairSession, inspectMechanism, releasePressure, alignComponent, testMechanism, getRepairSummary } from '../systems/mechanical-repair.js';

export function render(container) {
  const session = createRepairSession({ id: 'blackford_watch_repair' });
  const paint = (message = 'Осмотрите механизм и прислушайтесь к пружине.') => {
    const phaseCopy = {
      inspect: ['01 / ОСМОТР', 'Внутри корпуса что-то зажато. Присмотритесь к пружине и определите, где осталось напряжение.'],
      release: ['02 / СНЯТИЕ НАТЯЖЕНИЯ', 'Пружина удерживает колесо. Освободите её плавно, не применяя силу.'],
      align: ['03 / УСТАНОВКА ДЕТАЛИ', 'Совместите зубец с небольшой отметкой на латунном кольце.'],
      test: ['04 / ПРОВЕРКА ХОДА', 'Механизм собран. Осторожно заведите часы и проверьте ход.'],
      completed: ['РЕМОНТ ЗАВЕРШЁН', 'Часы снова идут. Их тихое тиканье возвращается в комнату.']
    };
    const [eyebrow, description] = phaseCopy[session.phase];
    const summary = getRepairSummary(session);
    container.innerHTML = `
      <section class="scene repair-scene">
        <header class="repair-header">
          <div><p class="repair-kicker">BLACKFORD · МАСТЕРСКАЯ / 1987</p><h1>ЧАСОВОЙ МЕХАНИЗМ</h1><p class="repair-subtitle">Карманные часы с повреждённой пружиной</p></div>
          <span class="repair-index">МЕХАНИКА I</span>
        </header>
        <div class="repair-layout">
          <div class="repair-art" role="img" aria-label="Схематичное изображение разобранного часового механизма">
            <div class="repair-glow"></div><div class="repair-watch">
              <div class="repair-ring ring-outer"></div><div class="repair-ring ring-inner"></div>
              <div class="repair-gear gear-one">✥</div><div class="repair-gear gear-two">✥</div><div class="repair-gear gear-three">✥</div>
              <div class="repair-spring"></div><div class="repair-pin"></div>
            </div>
            <div class="repair-art-caption">PLATE 04 · SPRING ASSEMBLY</div>
          </div>
          <div class="repair-panel">
            <p class="repair-step">${eyebrow}</p>
            <p class="repair-description">${description}</p>
            <div class="repair-feedback" aria-live="polite">${message}</div>
            <div class="repair-actions">
              ${session.phase === 'inspect' ? '<button data-action="inspect-good">Пружина под натяжением</button><button class="repair-secondary" data-action="inspect-wrong">Ослабленное колесо</button>' : ''}
              ${session.phase === 'release' ? '<button data-action="release-safe">Плавно снять натяжение</button><button class="repair-danger" data-action="release-force">Применить силу</button>' : ''}
              ${session.phase === 'align' ? '<button data-action="align-good">Совместить по метке</button><button class="repair-secondary" data-action="align-wrong">Установить наоборот</button>' : ''}
              ${session.phase === 'test' ? '<button data-action="test-safe">Осторожно завести часы</button><button class="repair-secondary" data-action="test-force">Резко завести</button>' : ''}
              ${session.phase === 'completed' ? '<div class="repair-result">${summary.outcome === 'success' ? 'БЕЗУПРЕЧНАЯ РАБОТА' : 'ЧАСЫ ЗАПУЩЕНЫ, НО МЕХАНИЗМ ПОСТРАДАЛ'}</div><button data-action="again">Повторить упражнение</button>' : ''}
            </div>
            <div class="repair-meta"><span>ОШИБКИ: ${summary.mistakes}</span><span>ПОВРЕЖДЕНИЯ: ${summary.damage}</span></div>
          </div>
        </div>
        <div class="repair-footer"><span>ТИШИНА МАСТЕРСКОЙ · 22:40</span><button data-action="exit">← ВЕРНУТЬСЯ В КАБИНЕТ</button></div>
      </section>`;
    container.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.action;
      let feedback = '';
      if (action === 'inspect-good') { inspectMechanism(session, 'spring_under_tension'); feedback = 'Вы заметили, где пружина удерживает напряжение.'; }
      if (action === 'inspect-wrong') { inspectMechanism(session, 'loose_gear'); feedback = 'Нет. Колесо свободно. Попробуйте осмотреть пружину ещё раз.'; }
      if (action === 'release-safe') { releasePressure(session, 'controlled_release'); feedback = 'Натяжение снято. Механизм больше не сопротивляется.'; }
      if (action === 'release-force') { releasePressure(session, 'force'); feedback = 'Резкий рывок повредил край пружины. Можно продолжить осторожнее.'; }
      if (action === 'align-good') { alignComponent(session, 'tooth_mark'); feedback = 'Зубец встал точно на отметку.'; }
      if (action === 'align-wrong') { alignComponent(session, 'reverse_tooth'); feedback = 'Деталь не входит в паз. Попробуйте изменить положение.'; }
      if (action === 'test-safe') { testMechanism(session, 'wind_gently'); feedback = 'Часы запущены.'; Events.emit('minigame:completed', { type: 'mechanical-repair', outcome: session.outcome }); GameState.recordMiniGameResult({ type: 'mechanical-repair', outcome: session.outcome }); recordCase001MiniGameEvidence(GameState, 'mechanical-repair', { outcome: session.outcome }); }
      if (action === 'test-force') { testMechanism(session, 'force'); feedback = 'Слишком резкое движение. Проверьте механизм ещё раз.'; }
      if (action === 'again') { render(container); return; }
      if (action === 'exit') { Events.emit('navigate', { scene: 'office' }); return; }
      paint(feedback);
    }));
  };
  paint();
}
