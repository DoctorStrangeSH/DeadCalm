const MIN_CONTROL = 0;
const MAX_CONTROL = 100;
const FRAME_DEFECTS = Object.freeze([
  { id: 'frame_01', defect: 'dust', description: 'Пыль на эмульсии', requiredAction: 'clean' },
  { id: 'frame_02', defect: 'scratch', description: 'Царапина на эмульсии', requiredAction: 'polish' },
  { id: 'frame_03', defect: 'tear', description: 'Разрыв у перфорации', requiredAction: 'splice' }
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function record(session, action, accepted, detail) {
  session.history.push({ action, accepted, detail, frameIndex: session.frameIndex });
  if (!accepted) session.mistakes += 1;
}

export function createFilmRestorationSession(config = {}) {
  return {
    id: typeof config.id === 'string' ? config.id : 'blackford-reel-01',
    phase: 'transport',
    frameIndex: 0,
    tension: 48,
    speed: 1,
    frames: FRAME_DEFECTS.map(frame => ({ ...frame, restored: false, damage: 0 })),
    mistakes: 0,
    filmDamage: 0,
    outcome: null,
    history: []
  };
}

export function adjustFilmTransport(session, controls = {}) {
  if (!session || session.phase !== 'transport') return null;
  if (Number.isFinite(controls.tension)) session.tension = clamp(controls.tension, MIN_CONTROL, MAX_CONTROL);
  if (Number.isFinite(controls.speed)) session.speed = clamp(controls.speed, 1, 5);
  return { tension: session.tension, speed: session.speed, safe: session.tension >= 35 && session.tension <= 62 && session.speed <= 2 };
}

export function advanceFilm(session) {
  if (!session || session.phase !== 'transport') return null;
  if (session.frameIndex >= session.frames.length) return null;
  const safe = session.tension >= 35 && session.tension <= 62 && session.speed <= 2;
  if (!safe) {
    session.filmDamage += 1;
    record(session, 'advance', false, 'unsafe_transport');
    return { advanced: false, reason: 'unsafe_transport', frameIndex: session.frameIndex };
  }
  const frame = session.frames[session.frameIndex];
  if (!frame.restored && frame.damage > 0) return { advanced: false, reason: 'frame_not_restored', frameIndex: session.frameIndex };
  if (!frame.restored) {
    record(session, 'advance', true, 'frame_reached');
    return { advanced: false, reason: 'restoration_required', frameIndex: session.frameIndex, defect: frame.defect };
  }
  session.frameIndex += 1;
  if (session.frameIndex >= session.frames.length) session.phase = 'projection';
  record(session, 'advance', true, 'frame_advanced');
  return { advanced: true, frameIndex: session.frameIndex, phase: session.phase };
}

export function restoreFilmFrame(session, action, value) {
  if (!session || session.phase !== 'transport' || session.frameIndex >= session.frames.length) return false;
  const frame = session.frames[session.frameIndex];
  if (frame.restored) return false;

  let accepted = false;
  let detail = 'wrong_restoration_method';
  if (frame.defect === 'dust' && action === 'clean') {
    accepted = Number.isFinite(value) && value >= 15 && value <= 40;
    detail = accepted ? 'emulsion_cleaned' : 'cleaning_pressure_out_of_range';
  } else if (frame.defect === 'scratch' && action === 'polish') {
    accepted = Number.isFinite(value) && value >= 5 && value <= 22;
    detail = accepted ? 'scratch_reduced' : 'polishing_pressure_out_of_range';
  } else if (frame.defect === 'tear' && action === 'splice') {
    accepted = Number.isFinite(value) && Math.abs(value) <= 0.35;
    detail = accepted ? 'film_spliced' : 'splice_misaligned';
  }

  if (accepted) {
    frame.restored = true;
    frame.damage = 0;
  } else {
    frame.damage += 1;
    if (action === 'clean' || action === 'polish' || action === 'splice') session.filmDamage += 1;
  }
  record(session, action, accepted, detail);
  return accepted;
}

export function testFilmProjection(session) {
  if (!session || session.phase !== 'projection' || session.outcome) return null;
  const restored = session.frames.filter(frame => frame.restored).length;
  const ratio = restored / session.frames.length;
  const outcome = ratio === 1 && session.filmDamage === 0 && session.mistakes === 0
    ? 'success'
    : ratio >= 2 / 3 && session.filmDamage <= 1 ? 'partial' : 'damaged';
  session.outcome = outcome;
  session.phase = 'completed';
  record(session, 'projection_test', true, outcome);
  return {
    outcome,
    restoredFrames: restored,
    totalFrames: session.frames.length,
    filmDamage: session.filmDamage,
    mistakes: session.mistakes
  };
}

export function getFilmRestorationSummary(session) {
  if (!session || !Array.isArray(session.frames)) return null;
  return {
    phase: session.phase,
    frameIndex: session.frameIndex,
    restoredFrames: session.frames.filter(frame => frame.restored).length,
    totalFrames: session.frames.length,
    filmDamage: session.filmDamage,
    mistakes: session.mistakes,
    outcome: session.outcome
  };
}
