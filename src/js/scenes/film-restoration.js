import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';
import { recordCase001MiniGameEvidence } from '../systems/case-001-evidence.js';
import { adjustFilmTransport, advanceFilm, createFilmRestorationSession, getFilmRestorationSummary, restoreFilmFrame, testFilmProjection } from '../systems/film-restoration.js';
import { canAccessCase001MiniGame } from '../systems/minigame-access.js';
import { renderMiniGameLockScreen } from '../components/minigame-lock-screen.js';

const DEFECTS = {
  dust: { title:'ПЫЛЬ НА ЭМУЛЬСИИ', text:'Удалите частицы мягкими короткими движениями. Слишком сильное давление повредит поверхность.', action:'clean', min:0, max:60, step:1, value:28, unit:'ДАВЛЕНИЕ', button:'ОЧИСТИТЬ КАДР', success:'Пыль снята. Эмульсия осталась целой.', failure:'Слишком сильное давление оставило след на эмульсии.' },
  scratch: { title:'ЦАРАПИНА НА ЭМУЛЬСИИ', text:'Продольная царапина пересекает изображение. Работайте полировальным тампоном без нажима.', action:'polish', min:0, max:40, step:1, value:14, unit:'ДАВЛЕНИЕ', button:'УБРАТЬ ЦАРАПИНУ', success:'Царапина сведена к минимуму.', failure:'Полировка оказалась слишком грубой.' },
  tear: { title:'РАЗРЫВ У ПЕРФОРАЦИИ', text:'Совместите края плёнки и отверстия перфорации. Только после этого закрепите монтажную ленту.', action:'splice', min:-1, max:1, step:.05, value:.2, unit:'СМЕЩЕНИЕ', button:'СОЕДИНИТЬ ПЛЁНКУ', success:'Перфорация совпала. Склейка держится ровно.', failure:'Края смещены. Склейка получилась неровной.' }
};

export function render(container) {
  if (!canAccessCase001MiniGame('film-restoration', GameState)) {
    renderMiniGameLockScreen(container, 'АРХИВНАЯ КИНОПЛЁНКА', 'Сначала получите вещи Маркуса от Анны, затем восстановите ключ из карманных часов в мастерской. Он откроет доступ к спрятанной катушке.');
    return;
  }
  const session = createFilmRestorationSession({ id:'blackford_archive_reel_01' });
  let completed = false;

  function draw(message = 'Проверьте натяжение и скорость. Хрупкая плёнка должна двигаться плавно.') {
    const summary = getFilmRestorationSummary(session);
    const frame = session.frames[session.frameIndex];
    const defect = frame ? DEFECTS[frame.defect] : null;
    const safe = session.tension >= 35 && session.tension <= 62 && session.speed <= 2;
    const progress = Math.round(summary.restoredFrames / summary.totalFrames * 100);
    const frames = session.frames.map((item,i) => '<span class="film-frame '+(item.restored?'restored':i===session.frameIndex?'current':'waiting')+'"><i></i><b>0'+(i+1)+'</b></span>').join('');
    container.innerHTML = `
      <section class="scene film-scene">
        <header class="film-header">
          <div><p class="film-kicker">BLACKFORD ARCHIVE · CONSERVATION ROOM / 1987</p><h1>РЕСТАВРАЦИЯ ПЛЁНКИ</h1><p class="film-subtitle">Архивная катушка · Рулон № 014 · Ночная смена</p></div>
          <span class="film-index">СЕАНС 03</span>
        </header>
        <div class="film-workspace">
          <div class="film-machine-column">
            <div class="film-machine">
              <div class="film-machine-top"><span>BLACKFORD OPTICAL</span><span>MODEL 35 / 1949</span></div>
              <div class="film-reel-stage">
                <div class="film-reel reel-left"><i></i><b></b></div>
                <div class="film-gate">
                  <div class="film-gate-glass">
                    <div class="film-image ${frame?.defect || 'clean'}">
                      <span class="film-image-horizon"></span><span class="film-image-shape"></span><span class="film-damage-mark"></span>
                      <span class="film-image-caption">BLACKFORD · 01:14 AM</span>
                    </div>
                  </div>
                  <div class="film-gate-label">OPTICAL GATE · FRAME ${String(session.frameIndex+1).padStart(4,'0')}</div>
                </div>
                <div class="film-reel reel-right"><i></i><b></b></div>
              </div>
              <div class="film-machine-controls"><span class="film-lamp"></span><span>TRANSPORT MOTOR</span><span id="film-machine-state">${safe?'STABLE':'CHECK TENSION'}</span></div>
              <div class="film-machine-foot"><span>35 MM · ACETATE</span><span>ARCHIVE COPY / DO NOT EXPOSE</span></div>
            </div>
            <div class="film-strip-track"><div class="film-strip-heading"><span>КАТУШКА / КАДРЫ</span><span>${summary.restoredFrames} ИЗ 3</span></div><div class="film-strip">${frames}</div></div>
          </div>
          <div class="film-console">
            <p class="film-step">01 / ПРОТЯЖНЫЙ МЕХАНИЗМ</p>
            <p class="film-description">Ацетатная плёнка стала хрупкой. Неверное натяжение или скорость могут разорвать её окончательно.</p>
            <label class="film-control-label" for="film-tension"><span>НАТЯЖЕНИЕ</span><strong id="film-tension-value">${session.tension}%</strong></label>
            <input class="film-range" id="film-tension" type="range" min="0" max="100" value="${session.tension}" aria-label="Натяжение плёнки">
            <div class="film-range-ends"><span>СЛАБО</span><span>ОПТИМУМ 35–62</span><span>СИЛЬНО</span></div>
            <label class="film-control-label" for="film-speed"><span>СКОРОСТЬ ПРОТЯЖКИ</span><strong id="film-speed-value">${session.speed}×</strong></label>
            <input class="film-range" id="film-speed" type="range" min="1" max="5" value="${session.speed}" aria-label="Скорость протяжки">
            <div class="film-range-ends"><span>МЕДЛЕННО</span><span>БЫСТРО</span></div>
            <div class="film-transport-status ${safe?'safe':'warning'}" id="film-transport-status" aria-live="polite">${safe?'НАТЯЖЕНИЕ В ДОПУСТИМОМ ДИАПАЗОНЕ':'ВНИМАНИЕ: РИСК ПОВРЕЖДЕНИЯ ПЛЁНКИ'}</div>
            <div class="film-divider"></div>
            <p class="film-step">02 / РЕСТАВРАЦИЯ КАДРА</p>
            ${defect ? `
              <p class="film-defect-title">${defect.title}</p><p class="film-description">${defect.text}</p>
              <label class="film-control-label" for="film-tool"><span>${defect.unit}</span><strong id="film-tool-value">${defect.value}</strong></label>
              <input class="film-range" id="film-tool" type="range" min="${defect.min}" max="${defect.max}" step="${defect.step}" value="${defect.value}" aria-label="${defect.unit}">
              <div class="film-range-ends"><span>МИНИМУМ</span><span>МАКСИМУМ</span></div>
              <button class="film-action" id="film-restore" ${frame.restored?'disabled':''}>${frame.restored?'КАДР ВОССТАНОВЛЕН':defect.button}</button>
            ` : '<p class="film-defect-title">КАТУШКА ГОТОВА К ПРОСМОТРУ</p><p class="film-description">Все кадры обработаны. Запустите контрольную проекцию.</p>'}
            <div class="film-feedback" id="film-feedback" aria-live="polite">${message}</div>
            <div class="film-progress"><span>СОСТОЯНИЕ КАТУШКИ</span><strong>${progress}%</strong></div><div class="film-progress-track"><i style="width:${progress}%"></i></div>
            <div class="film-actions-row"><button class="film-secondary" id="film-advance" ${!frame?.restored || !safe?'disabled':''}>${session.phase==='projection'?'ЗАПУСТИТЬ ПРОЕКТОР':'СЛЕДУЮЩИЙ КАДР →'}</button><button class="film-exit" id="film-exit">ВЫХОД</button></div>
          </div>
        </div>
        <footer class="film-footer"><span>КОНСЕРВАЦИОННАЯ · 01:14 · ДОЖДЬ ЗА ОКНОМ</span><span>АРХИВ BLACKFORD / 35 MM</span></footer>
      </section>`;

    const tension = container.querySelector('#film-tension');
    const speed = container.querySelector('#film-speed');
    const tool = container.querySelector('#film-tool');
    function refreshTransport() {
      const ok = session.tension >= 35 && session.tension <= 62 && session.speed <= 2;
      const status = container.querySelector('#film-transport-status');
      container.querySelector('#film-machine-state').textContent = ok ? 'STABLE' : 'CHECK TENSION';
      status.className = 'film-transport-status '+(ok?'safe':'warning');
      status.textContent = ok ? 'НАТЯЖЕНИЕ В ДОПУСТИМОМ ДИАПАЗОНЕ' : 'ВНИМАНИЕ: РИСК ПОВРЕЖДЕНИЯ ПЛЁНКИ';
      container.querySelector('#film-advance').disabled = !session.frames[session.frameIndex]?.restored || !ok;
    }
    tension.addEventListener('input', () => {
      adjustFilmTransport(session,{tension:Number(tension.value)});
      container.querySelector('#film-tension-value').textContent=session.tension+'%';
      refreshTransport();
    });
    speed.addEventListener('input', () => {
      adjustFilmTransport(session,{speed:Number(speed.value)});
      container.querySelector('#film-speed-value').textContent=session.speed+'×';
      refreshTransport();
    });
    if (tool && defect && !frame.restored) tool.addEventListener('input',()=>container.querySelector('#film-tool-value').textContent=Number(tool.value).toFixed(defect.action==='splice'?2:0));
    if (defect && !frame.restored) container.querySelector('#film-restore').addEventListener('click',()=>{
      const ok=restoreFilmFrame(session,defect.action,Number(tool.value));
      draw(ok?defect.success:defect.failure);
    });
    container.querySelector('#film-advance').addEventListener('click',()=>{
      if(session.phase==='projection'){ project(); return; }
      const result=advanceFilm(session);
      if(!result?.advanced){ draw(result?.reason==='unsafe_transport'?'Протяжка остановлена. Снизьте скорость и настройте натяжение.':'Сначала завершите реставрацию кадра.'); return; }
      draw(result.phase==='projection'?'Все кадры обработаны. Запустите контрольную проекцию.':'Следующий участок плёнки остановлен. Проверьте повреждение.');
    });
    container.querySelector('#film-exit').addEventListener('click',()=>Events.emit('navigate',{scene:'office'}));
  }

  function project() {
    if(completed)return;
    const result=testFilmProjection(session);
    if(!result)return;
    completed=true;
    const quality=result.outcome==='success'?100:result.outcome==='partial'?70:30;
    GameState.recordMiniGameResult({type:'film-restoration',outcome:result.outcome,quality});
    recordCase001MiniGameEvidence(GameState, 'film-restoration', { outcome: result.outcome, quality });
    Events.emit('minigame:completed',{type:'film-restoration',outcome:result.outcome,quality});
    const copy=result.outcome==='success'?'Все три кадра восстановлены без повреждений. Проектор снова работает ровно.':result.outcome==='partial'?'Плёнку удалось спасти, но некоторые следы останутся на изображении.':'Запись удалось частично сохранить. В следующий раз уменьшите натяжение и давление инструментов.';
    container.innerHTML=`
      <section class="scene film-scene film-result-scene">
        <header class="film-header"><div><p class="film-kicker">BLACKFORD ARCHIVE · CONSERVATION ROOM / 1987</p><h1>КОНТРОЛЬНАЯ ПРОЕКЦИЯ</h1><p class="film-subtitle">Проверка восстановленной катушки</p></div><span class="film-index">ОТЧЁТ 03</span></header>
        <div class="film-result"><div class="film-result-reel">◎</div><p class="film-step">${result.outcome==='success'?'ВОССТАНОВЛЕНО':result.outcome==='partial'?'ЧАСТИЧНАЯ РЕСТАВРАЦИЯ':'ПЛЁНКА ПОВРЕЖДЕНА'}</p><p class="film-description">${copy}</p>
          <div class="film-result-stats"><span>КАДРОВ ВОССТАНОВЛЕНО <b>${result.restoredFrames}/3</b></span><span>ПОВРЕЖДЕНИЯ <b>${result.filmDamage}</b></span><span>ОШИБКИ <b>${result.mistakes}</b></span></div>
          <button class="film-action" id="film-replay">ПОВТОРИТЬ РЕСТАВРАЦИЮ</button><button class="film-secondary" id="film-result-exit">ВЕРНУТЬСЯ В КАБИНЕТ</button>
        </div>
      </section>`;
    container.querySelector('#film-replay').addEventListener('click',()=>render(container));
    container.querySelector('#film-result-exit').addEventListener('click',()=>Events.emit('navigate',{scene:'office'}));
  }
  draw();
}
