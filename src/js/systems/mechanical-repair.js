const PHASES = ['inspect','release','align','test','completed'];
const OUTCOMES = new Set(['success','partial','damaged']);

export function createRepairSession(config = {}) {
  return {
    id: typeof config.id === 'string' ? config.id : 'repair-session',
    phase: 'inspect',
    tensionIdentified: false,
    pressureReleased: false,
    componentAligned: false,
    mistakes: 0,
    damage: 0,
    outcome: null,
    history: []
  };
}

function record(session, action, accepted, detail) {
  session.history.push({ action, accepted, detail });
  if (!accepted) session.mistakes += 1;
}

export function inspectMechanism(session, observation) {
  if (!session || session.phase !== 'inspect') return false;
  const accepted = observation === 'spring_under_tension';
  if (accepted) {
    session.tensionIdentified = true;
    session.phase = 'release';
  }
  record(session, 'inspect', accepted, accepted ? 'tension_identified' : 'uncertain_observation');
  return accepted;
}

export function releasePressure(session, method) {
  if (!session || session.phase !== 'release') return false;
  const accepted = session.tensionIdentified && method === 'controlled_release';
  if (accepted) {
    session.pressureReleased = true;
    session.phase = 'align';
  } else if (method === 'force') {
    session.damage += 1;
  }
  record(session, 'release_pressure', accepted, accepted ? 'pressure_safe' : method === 'force' ? 'mechanism_damaged' : 'pressure_unresolved');
  return accepted;
}

export function alignComponent(session, alignment) {
  if (!session || session.phase !== 'align') return false;
  const accepted = session.pressureReleased && alignment === 'tooth_mark';
  if (accepted) {
    session.componentAligned = true;
    session.phase = 'test';
  }
  record(session, 'align_component', accepted, accepted ? 'component_seated' : 'misalignment');
  return accepted;
}

export function testMechanism(session, testAction = 'wind_gently') {
  if (!session || session.phase !== 'test' || !session.componentAligned) return null;
  if (testAction !== 'wind_gently') {
    session.damage += 1;
    record(session, 'test_mechanism', false, 'unsafe_test');
    return null;
  }
  const outcome = session.damage > 0 ? 'partial' : session.mistakes > 0 ? 'partial' : 'success';
  session.outcome = outcome;
  session.phase = 'completed';
  record(session, 'test_mechanism', true, outcome);
  return outcome;
}

export function getRepairSummary(session) {
  if (!session || !PHASES.includes(session.phase)) return null;
  return {
    phase: session.phase,
    mistakes: session.mistakes,
    damage: session.damage,
    outcome: OUTCOMES.has(session.outcome) ? session.outcome : null,
    canRecover: session.phase !== 'completed'
  };
}

export function getRepairOutcomeLabel(outcome) {
  if (outcome === 'success') return 'БЕЗУПРЕЧНАЯ РАБОТА';
  if (outcome === 'partial') return 'ЧАСЫ ЗАПУЩЕНЫ, НО МЕХАНИЗМ ПОСТРАДАЛ';
  return 'РЕЗУЛЬТАТ НЕ ЗАФИКСИРОВАН';
}
