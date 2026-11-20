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
    ['port_cargo_ledger', 'Портовая книга грузов'],
    ['markus_statement', 'Признание Маркуса Холта']
  ];
  const missing = required.filter(([id]) => !gameState.hasClue(id)).map(([, label]) => label);
  const hasIndependentRecord = gameState.hasClue('restored_film_frame') || gameState.hasClue('port_radio_fragment');
  if (!hasIndependentRecord) missing.push('Независимый фрагмент плёнки или радиозаписи');
  const filmQuality = Number(gameState.getClue?.('restored_film_frame')?.quality || 0);
  return { ready: missing.length === 0, publicReady: missing.length === 0 && filmQuality >= 95, missing, filmQuality };
}


export function buildFinalEvidenceDossier(gameState) {
  const dossier = [
    {
      title: 'Причина смерти',
      finding: 'Заключение Лидии устанавливает отравление Гаррисона экстрактом белладонны.',
      limit: 'Экспертиза не устанавливает, кто приобрёл яд и кто дал его судье.'
    },
    {
      title: 'Встреча с Гаррисоном',
      finding: 'Карточка фиксирует назначенную встречу судьи с Себастьяном в день смерти.',
      limit: 'План встречи сам по себе не подтверждает, что Блэквуд пришёл.'
    },
    {
      title: 'Источник белладонны',
      finding: 'Аптечная запись связывает покупку экстракта за день до смерти с офисом Блэквуда.',
      limit: 'Получатель препарата и путь от покупки до судьи документально не установлены.'
    },
    {
      title: 'Связь со старым делом',
      finding: 'Портовая книга связывает компанию Блэквуда с грузами в ночь гибели Каллиопы.',
      limit: 'Это копия, представленная Себастьяном; сама по себе она не доказывает убийство.'
    },
    {
      title: 'Ответственность Маркуса',
      finding: 'Маркус признаёт, что изменил время в протоколе 1967 года и спрятал оригинальную плёнку.',
      limit: 'Он признаёт сокрытие, но не утверждает, что видел убийство Гаррисона.'
    }
  ];

  if (gameState.hasClue('court_switchboard_log')) {
    dossier.push({
      title: 'Расхождение во времени',
      finding: 'Первичный рапорт ссылался на звонок из суда, но журнал не называет абонента; вскрытие не подтверждает версию о мгновенной смерти.',
      limit: 'Неизвестный звонящий и ошибка в рапорте не устанавливают личность убийцы.'
    });
  }

  const film = gameState.getClue?.('restored_film_frame');
  if (film) {
    const quality = Number(film.quality || 0);
    dossier.push({
      title: 'Восстановленная плёнка',
      finding: quality >= 95
        ? 'На кадре различимы Себастьян и Каллиопа у старого причала незадолго до её смерти.'
        : 'На частичном кадре различимы две фигуры и автомобиль у старого причала.',
      limit: quality >= 95
        ? 'Кадр подтверждает присутствие, но не показывает момент убийства и не относится к вечеру смерти Гаррисона.'
        : 'Личности на частичном кадре пока нельзя считать установленными.'
    });
  }

  if (gameState.hasClue('port_radio_fragment')) {
    dossier.push({
      title: 'Радиофрагмент',
      finding: 'Запись подтверждает движение машины и временное окно у причала.',
      limit: 'Голос не идентифицирован; запись не называет водителя или говорившего.'
    });
  }

  return dossier;
}

export function getCampaignCaseSummary(gameState) {
  const completed = Boolean(gameState?.campaign?.completed);
  const ending = gameState?.campaign?.ending;
  const endingLabel = ending === 'open_case'
    ? 'ОТКРЫТОЕ ДЕЛО'
    : ending === 'price_of_silence'
      ? 'ЦЕНА МОЛЧАНИЯ'
      : null;

  return {
    completed,
    activeCount: completed ? 0 : 1,
    completedCount: completed ? 1 : 0,
    endingLabel: completed ? endingLabel : null
  };
}
