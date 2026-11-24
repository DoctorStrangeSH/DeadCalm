import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { recordCase001MiniGameEvidence } from '../systems/case-001-evidence.js';
import { createRadioSession, tuneRadio, adjustRadioFilter, getRadioSignal, completeRadioSession } from '../systems/radio-tuning.js';
import { canAccessCase001MiniGame } from '../systems/minigame-access.js';
import { renderMiniGameLockScreen } from '../components/minigame-lock-screen.js';

export function render(container) {
  if (!canAccessCase001MiniGame('radio-tuning', GameState)) {
    renderMiniGameLockScreen(container, 'ПОРТОВАЯ РАДИОЧАСТОТА', 'Эта частота появится в расследовании, когда вы доберётесь до старого порта на четвёртый день.');
    return;
  }
  const session = createRadioSession({ id: 'blackford_shortwave_01' });
  let finished = false;

  const renderSignal = (message = 'Сначала найдите частоту, на которой сквозь помехи проступает голос.') => {
    const signal = getRadioSignal(session);
    const status = signal.clarity === 'clear' ? 'ГОЛОС ПРОСТУПАЕТ ЧЁТКО'
      : signal.clarity === 'fragmented' ? 'СЛОВА ТОНУТ В ПОМЕХАХ' : 'ТОЛЬКО ШУМ И ТРЕСК';
    const bars = [20, 38, 56, 74, 92].map((threshold, index) =>
      `<span class="radio-bar ${signal.quality >= threshold ? 'active' : ''}"></span>`).join('');
    container.innerHTML = `
      <section class="scene radio-scene">
        <header class="radio-header">
          <div><p class="radio-kicker">BLACKFORD · SHORTWAVE / 1987</p><h1>ЭФИР НА ГРАНИЦЕ</h1><p class="radio-subtitle">Старый коротковолновый приёмник · Ночная частота</p></div>
          <span class="radio-index">СЕАНС 02</span>
        </header>
        <div class="radio-layout">
          <div class="radio-hardware">
            <div class="radio-brand">MARCONI <span>FIELD RECEIVER</span></div>
            <div class="radio-display">
              <div class="radio-display-label">FREQUENCY / MHz</div>
              <div class="radio-frequency">${session.frequency.toFixed(1)} <small>MHz</small></div>
              <div class="radio-bars">${bars}</div>
              <div class="radio-display-status" aria-live="polite">${status}</div>
            </div>
            <div class="radio-dial-wrap"><div class="radio-dial"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></div><div class="radio-needle" style="left:${((session.frequency - 88) / 20) * 100}%"></div></div>
            <div class="radio-speaker"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div class="radio-hardware-footer"><span>POWER ● ON</span><span>ANALOG / AM</span></div>
          </div>
          <div class="radio-controls">
            <p class="radio-step">ПОИСК ЧИСТОГО СИГНАЛА</p>
            <p class="radio-description">Где-то в эфире повторяется короткая передача. Вращайте настройку медленно. Когда голос станет различим, уберите лишний треск фильтром.</p>
            <label class="radio-control-label" for="radio-frequency"><span>ТОЧНАЯ НАСТРОЙКА</span><strong id="radio-frequency-value">${session.frequency.toFixed(1)} MHz</strong></label>
            <input id="radio-frequency" class="radio-range" type="range" min="88" max="108" step="0.1" value="${session.frequency}" aria-label="Частота радиоприёмника" aria-valuetext="${session.frequency.toFixed(1)} мегагерц">
            <div class="radio-range-ends"><span>88.0</span><span>108.0 MHz</span></div>
            <label class="radio-control-label" for="radio-filter"><span>ФИЛЬТР ПОМЕХ</span><strong id="radio-filter-value">${session.filter}%</strong></label>
            <input id="radio-filter" class="radio-range filter-range" type="range" min="0" max="100" step="1" value="${session.filter}" aria-label="Фильтр радиопомех" aria-valuetext="${session.filter} процентов">
            <div class="radio-range-ends"><span>ШИРОКО</span><span>УЗКО</span></div>
            <div class="radio-feedback" id="radio-feedback" role="status" aria-live="polite" aria-atomic="true">${message}</div>
            <div class="radio-quality" id="radio-quality-label"><span>КАЧЕСТВО ПРИЁМА</span><strong>${signal.quality}%</strong></div>
            <div class="radio-quality-track" role="progressbar" aria-labelledby="radio-quality-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${signal.quality}"><span style="width:${signal.quality}%"></span></div>
            <button class="radio-finish" id="radio-finish" ${finished ? 'disabled' : ''}>ЗАВЕРШИТЬ ПРИЁМ</button>
            <p class="radio-hint">Совет: максимум сигнала достигается настройкой частоты и умеренным фильтром.</p>
          </div>
        </div>
        <footer class="radio-footer"><span>ПРИЁМНАЯ · 23:17 · ДОЖДЬ СНАРУЖИ</span><button id="radio-exit">← ВЕРНУТЬСЯ В КАБИНЕТ</button></footer>
      </section>`;

    const frequency = container.querySelector('#radio-frequency');
    const filter = container.querySelector('#radio-filter');
    const updateReadouts = (message) => {
      const current = getRadioSignal(session);
      container.querySelector('#radio-frequency-value').textContent = session.frequency.toFixed(1) + ' MHz';
      container.querySelector('#radio-filter-value').textContent = session.filter + '%';
      frequency.setAttribute('aria-valuetext', session.frequency.toFixed(1) + ' мегагерц');
      filter.setAttribute('aria-valuetext', session.filter + ' процентов');
      container.querySelector('.radio-frequency').innerHTML = session.frequency.toFixed(1) + ' <small>MHz</small>';
      container.querySelector('.radio-display-status').textContent = current.clarity === 'clear'
        ? 'ГОЛОС ПРОСТУПАЕТ ЧЁТКО' : current.clarity === 'fragmented' ? 'СЛОВА ТОНУТ В ПОМЕХАХ' : 'ТОЛЬКО ШУМ И ТРЕСК';
      container.querySelectorAll('.radio-bar').forEach((bar, index) => {
        bar.classList.toggle('active', current.quality >= [20, 38, 56, 74, 92][index]);
      });
      container.querySelector('.radio-needle').style.left = ((session.frequency - 88) / 20) * 100 + '%';
      container.querySelector('.radio-quality strong').textContent = current.quality + '%';
      container.querySelector('.radio-quality-track').setAttribute('aria-valuenow', String(current.quality));
      container.querySelector('.radio-quality-track span').style.width = current.quality + '%';
      container.querySelector('#radio-feedback').textContent = message;
    };
    frequency.addEventListener('input', () => {
      tuneRadio(session, Number(frequency.value));
      updateReadouts('Вы меняете частоту. Прислушайтесь: голос уже ближе или всё ещё скрыт шумом?');
    });
    filter.addEventListener('input', () => {
      adjustRadioFilter(session, Number(filter.value));
      updateReadouts('Фильтр изменён. Слишком узкая настройка может обрезать сам голос.');
    });
    container.querySelector('#radio-finish').addEventListener('click', () => {
      const result = completeRadioSession(session);
      if (!result) return;
      finished = true;
      const copy = result.result === 'clear'
        ? 'Передача различима. Вы смогли выделить голос из ночного эфира.'
        : result.result === 'fragmented'
          ? 'Несколько слов удалось разобрать, но часть передачи потеряна.'
          : 'Запись осталась неразборчивой. В эфире сохранился только шум.';
      Events.emit('minigame:completed', { type: 'radio-tuning', outcome: result.result, quality: result.quality });
      GameState.recordMiniGameResult({ type: 'radio-tuning', outcome: result.result, quality: result.quality });
      recordCase001MiniGameEvidence(GameState, 'radio-tuning', { outcome: result.result, quality: result.quality });
      renderResult(copy, result);
    });
    container.querySelector('#radio-exit').addEventListener('click', () => Events.emit('navigate', { scene: 'office' }));
  };

  const renderResult = (copy, result) => {
    const signal = getRadioSignal(session);
    container.innerHTML = `
      <section class="scene radio-scene">
        <header class="radio-header"><div><p class="radio-kicker">BLACKFORD · SHORTWAVE / 1987</p><h1>ПРИЁМ ЗАВЕРШЁН</h1><p class="radio-subtitle">Результат настройки</p></div><span class="radio-index">ОТЧЁТ 02</span></header>
        <div class="radio-result-panel">
          <div class="radio-result-mark">${result.result === 'clear' ? '◉' : result.result === 'fragmented' ? '◌' : '×'}</div>
          <p class="radio-step">${result.result === 'clear' ? 'ЧИСТЫЙ ПРИЁМ' : result.result === 'fragmented' ? 'ФРАГМЕНТАРНЫЙ ПРИЁМ' : 'СИГНАЛ НЕ РАЗОБРАН'}</p>
          <p class="radio-description">${copy}</p>
          <div class="radio-result-stats"><span>ЧАСТОТА <b>${result.frequency.toFixed(1)} MHz</b></span><span>КАЧЕСТВО <b>${result.quality}%</b></span></div>
          <button class="radio-finish" id="radio-again">ПОВТОРИТЬ НАСТРОЙКУ</button>
          <button class="radio-back" id="radio-result-exit">ВЕРНУТЬСЯ В КАБИНЕТ</button>
        </div>
      </section>`;
    container.querySelector('#radio-again').addEventListener('click', () => render(container));
    container.querySelector('#radio-result-exit').addEventListener('click', () => Events.emit('navigate', { scene: 'office' }));
  };

  renderSignal();
}
