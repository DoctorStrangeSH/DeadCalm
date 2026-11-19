export const COURT_STAGE_IDS = [
  'court-records', 'court-witnesses', 'guard-follow-up', 'court-visitors',
  'secretary-follow-up', 'orlov-inquiry', 'orlov-confrontation', 'nk-identity', 'reader-verification', 'reader-interviews', 'witness-corroboration', 'klimov-confrontation', 'key-note-trace', 'note-authorship', 'extension-seventeen-check'
];

export function summarizeCourtStages(stages) {
  const unlocked = stages.filter(stage => stage.unlocked);
  return {
    actionable: unlocked.filter(stage => !stage.completed).length,
    completed: unlocked.filter(stage => stage.completed).length,
    locked: stages.length - unlocked.length
  };
}

export function setupCourtWorkflow(container) {
  const list = container.querySelector('#court-workflow-stages');
  const heading = container.querySelector('#court-workflow-status');
  const toggle = container.querySelector('#court-show-completed');
  const nodes = COURT_STAGE_IDS.map(id => container.querySelector('#' + id)).filter(Boolean);
  nodes.forEach(node => {
    node.classList.add('court-workflow-stage');
    list.appendChild(node);
  });

  let showCompleted = false;
  function refresh() {
    const stageState = nodes.map(node => {
      const buttons = [...node.querySelectorAll('button')];
      const completed = buttons.length > 0 && buttons.every(button => button.disabled);
      node.classList.toggle('court-stage-complete', completed);
      return { node, unlocked: !node.hidden, completed };
    });
    const progress = summarizeCourtStages(stageState);
    // Current investigations first; completed sections remain accessible on demand.
    stageState.sort((a, b) => Number(a.completed) - Number(b.completed));
    stageState.forEach(stage => list.appendChild(stage.node));
    list.classList.toggle('court-show-completed', showCompleted);
    heading.textContent = progress.actionable > 0
      ? `Доступно проверок: ${progress.actionable} · завершено этапов: ${progress.completed}`
      : progress.completed > 0 ? `Все доступные проверки выполнены · завершено этапов: ${progress.completed}`
        : 'Новые проверки появятся после сопоставления улик на доске.';
    toggle.hidden = progress.completed === 0;
    toggle.textContent = showCompleted ? 'СКРЫТЬ ЗАВЕРШЁННЫЕ' : `ПОКАЗАТЬ ЗАВЕРШЁННЫЕ (${progress.completed})`;
  }

  toggle.addEventListener('click', () => { showCompleted = !showCompleted; refresh(); });
  refresh();
  return refresh;
}
