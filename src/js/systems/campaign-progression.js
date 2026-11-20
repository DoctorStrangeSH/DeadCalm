const DAY_REQUIREMENTS = {
  1: {
    label: 'Первичная картина преступления',
    all: [
      ['autopsy_report_01', 'Заключение Лидии о причине смерти'],
      ['court_switchboard_log', 'Выписка о звонке из суда'],
      ['judge_appointment_card', 'Карточка встречи Гаррисона с Блэквудом'],
      ['old_case_details', 'Связь с делом Каллиопы']
    ]
  },
  2: {
    label: 'Проверка старых показаний',
    all: [
      ['marta_source_envelope', 'Конверт анонимного источника'],
      ['matthews_letter', 'Письмо Мэтьюса']
    ]
  },
  3: {
    label: 'Проверка версии Блэквуда',
    all: [
      ['port_cargo_ledger', 'Портовая книга грузов']
    ]
  },
  4: {
    label: 'Подготовка финального предъявления',
    all: [
      ['anna_markus_items', 'Вещи Маркуса от Анны'],
      ['belladonna_invoice', 'Счёт за экстракт белладонны']
    ],
    any: [
      ['restored_film_frame', 'Восстановленный кадр плёнки'],
      ['port_radio_fragment', 'Фрагмент портовой радиосвязи']
    ]
  }
};

export function assessCampaignDay(gameState) {
  const day = gameState?.campaign?.day || 1;
  if (gameState?.campaign?.completed) {
    return { day, canAdvance: false, complete: true, label: 'Дело завершено', missing: [] };
  }
  if (day >= 5) {
    return { day, canAdvance: false, complete: false, finaleReady: true, label: 'Последний рейс', missing: [] };
  }

  const requirement = DAY_REQUIREMENTS[day];
  const missing = (requirement?.all || [])
    .filter(([id]) => !gameState.hasClue(id))
    .map(([, label]) => label);
  const any = requirement?.any || [];
  if (any.length && !any.some(([id]) => gameState.hasClue(id))) {
    missing.push('Хотя бы одно независимое свидетельство: плёнка или радиозапись');
  }
  return {
    day,
    canAdvance: missing.length === 0,
    complete: false,
    finaleReady: false,
    label: requirement?.label || 'Расследование',
    missing
  };
}

export function advanceCampaignWhenReady(gameState) {
  const status = assessCampaignDay(gameState);
  if (!status.canAdvance) return { advanced: false, status };
  return { advanced: Boolean(gameState.advanceCampaignDay()), status };
}

export function assessFinalEvidence(gameState) {
  const required = [
    ['autopsy_report_01', 'Заключение Лидии'],
    ['judge_appointment_card', 'Карточка встречи с Гаррисоном'],
    ['belladonna_invoice', 'Счёт за белладонну'],
    ['matthews_letter', 'Письмо Мэтьюса'],
    ['port_cargo_ledger', 'Портовая книга грузов']
  ];
  const missing = required.filter(([id]) => !gameState.hasClue(id)).map(([, label]) => label);
  const hasIndependentRecord = gameState.hasClue('restored_film_frame') || gameState.hasClue('port_radio_fragment');
  if (!hasIndependentRecord) missing.push('Независимый фрагмент плёнки или радиозаписи');
  const filmQuality = Number(gameState.getClue?.('restored_film_frame')?.quality || 0);
  return { ready: missing.length === 0, publicReady: missing.length === 0 && filmQuality >= 95, missing, filmQuality };
}