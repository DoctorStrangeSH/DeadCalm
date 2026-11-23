const evidence = {
  'mechanical-repair': {
    id: 'markus_watch_key',
    name: 'Ключ из карманных часов Маркуса',
    category: 'object',
    location: 'holt_house',
    day: 4,
    source: 'Карманные часы Маркуса Холта',
    connections_to: ['anna_markus_items'],
    description: 'После аккуратного ремонта механизм снова идёт. Под крышкой обнаружен тонкий латунный ключ с номером архивного ящика. Это объясняет, зачем Маркус просил сохранить часы, но ещё не раскрывает содержимое ящика.'
  },
  'radio-tuning': {
    id: 'port_radio_fragment',
    name: 'Фрагмент портовой радиосвязи',
    category: 'audio',
    location: 'port',
    day: 4,
    source: 'Портовый радиоканал',
    connections_to: ['port_cargo_ledger', 'reader_reconstructed_timeline'],
    description: ''
  },
  'film-restoration': {
    id: 'restored_film_frame',
    name: 'Восстановленный кадр 16-мм плёнки',
    category: 'photo',
    location: 'holt_house',
    day: 4,
    source: 'Оригинальная плёнка Маркуса',
    connections_to: ['anna_markus_items', 'port_cargo_ledger'],
    description: ''
  }
};

export function buildCase001MiniGameEvidence(type, result) {
  const template = evidence[type];
  if (!template || !result || typeof result !== 'object') return null;

  const reportedQuality = Number(result.quality);
  if (type === 'mechanical-repair' && result.outcome !== 'success') return null;
  if (type === 'radio-tuning') {
    if (!Number.isFinite(reportedQuality) || reportedQuality < 68 || reportedQuality > 100) return null;
    if (result.outcome === 'clear' && reportedQuality < 92) return null;
    if (result.outcome === 'fragmented' && (reportedQuality < 68 || reportedQuality >= 92)) return null;
    if (!['clear', 'fragmented'].includes(result.outcome)) return null;
  }
  if (type === 'film-restoration') {
    if (!Number.isFinite(reportedQuality) || reportedQuality < 70 || reportedQuality > 100) return null;
    if (result.outcome === 'success' && reportedQuality < 95) return null;
    if (result.outcome === 'partial' && (reportedQuality < 70 || reportedQuality >= 95)) return null;
    if (!['success', 'partial'].includes(result.outcome)) return null;
  }

  const quality = type === 'mechanical-repair' ? 100 : Math.round(reportedQuality);
  let description = template.description;

  if (type === 'radio-tuning') {
    description = result.outcome === 'clear'
      ? 'Приём чистый. Фрагмент подтверждает движение машины и временное окно у причала. Голос различим не настолько, чтобы установить личность говорившего без независимого сопоставления.'
      : 'Приём фрагментарный. Удалось различить короткую передачу и шум двигателя в нужном временном окне. Голос не идентифицирован; запись не устанавливает личность говорившего.';
  }
  if (type === 'film-restoration') {
    description = quality >= 95
      ? 'На восстановленном кадре различимы Себастьян Блэквуд и Каллиопа у старого причала незадолго до её смерти. Кадр опровергает часть алиби, но не показывает момент убийства.'
      : 'На частично восстановленном кадре различимы две фигуры и контур автомобиля у старого причала. Личности пока нельзя считать подтверждёнными; требуется сопоставление с независимыми портовыми документами.';
  }

  return { ...template, description, quality };
}

export function recordCase001MiniGameEvidence(gameState, type, result) {
  const clue = buildCase001MiniGameEvidence(type, result);
  if (!clue || !gameState) return false;

  const existing = gameState.getClue?.(clue.id);
  if (existing) {
    if ((existing.quality || 0) >= clue.quality) return false;

    const previousQuality = existing.quality;
    const previousDescription = existing.description;
    existing.quality = clue.quality;
    existing.description = clue.description;

    let saved = false;
    try {
      saved = gameState.save?.() !== false;
    } catch (error) {
      console.error('[Case001Evidence] Не удалось сохранить улучшенное доказательство:', error);
    }
    if (!saved) {
      if (previousQuality === undefined) delete existing.quality;
      else existing.quality = previousQuality;
      existing.description = previousDescription;
      return false;
    }
    return true;
  }

  const added = gameState.addClue(clue);
  // Some lightweight adapters return no value but expose the committed record;
  // trust the stored clue, not the adapter's return convention.
  const stored = gameState.getClue?.(clue.id);
  return Boolean(stored && (stored.quality === undefined || stored.quality === clue.quality) && added !== false);
}
