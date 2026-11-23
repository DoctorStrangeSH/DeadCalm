const DAY_SUMMARIES = {
  1: {
    title: 'Чужое время',
    facts: [
      ['autopsy_report_01', 'established', 'Экспертиза Лидии установила отравление белладонной и более длительное действие яда, чем указано в первом рапорте.'],
      ['judge_appointment_card', 'established', 'В ежедневнике Гаррисона назначена встреча с Себастьяном Блэквудом на 19:30.'],
      ['court_switchboard_log', 'established', 'Выписка подтверждает звонок из суда, но не называет человека, который его совершил.'],
      ['judge_appointment_card', 'refuted', 'Карточка встречи не доказывает, что Блэквуд действительно пришёл.'],
      ['court_switchboard_log', 'refuted', 'Запись о звонке сама по себе не устанавливает личность звонившего.']
    ],
    unknown: [
      'Кто именно звонил из комнаты секретарей и кто пользовался внутренним номером 17.',
      'Кто передал Гаррисону яд и когда именно это произошло.'
    ]
  },
  2: {
    title: 'Чужие показания',
    facts: [
      ['marta_source_envelope', 'established', 'Марта получила документы от неизвестного источника; сам конверт не раскрывает его личность.'],
      ['matthews_letter', 'established', 'Письмо Мэтьюса подтверждает, что он дал ложное алиби человеку, связанному с портом.'],
      ['matthews_letter', 'refuted', 'Письмо не доказывает, что Мэтьюс видел убийство Каллиопы.'],
      ['matthews_letter', 'refuted', 'Ложное алиби не устанавливает, кто именно совершил убийство.']
    ],
    unknown: [
      'Кем был источник Марты и какие сведения он наблюдал лично.',
      'Кто именно воспользовался ложным алиби и какие части старого дела были изменены.'
    ]
  },
  3: {
    title: 'Человек на холме',
    facts: [
      ['port_cargo_ledger', 'established', 'Себастьян предоставил копию грузовой книги с исправлениями и записями о грузах своей компании в ночь гибели Каллиопы.'],
      ['port_cargo_ledger', 'established', 'Документ связывает компанию Блэквуда с портом и нужным временным окном.'],
      ['port_cargo_ledger', 'refuted', 'Сам факт знакомства Себастьяна с Каллиопой не является доказательством убийства.'],
      ['port_cargo_ledger', 'refuted', 'Копия, переданная самим подозреваемым, не становится независимым подтверждением только из-за наличия печатей и записей.']
    ],
    unknown: [
      'Подлинность и полнота копии, переданной Себастьяном, требуют сравнения с архивным экземпляром.',
      'Кто физически действовал у причала и что произошло после встречи с Каллиопой.'
    ]
  },
  4: {
    title: 'Плёнка и след Маркуса',
    facts: [
      ['anna_markus_items', 'established', 'Анна показывает часы, ключ и конверт, оставленные Маркусом; назначение этих вещей пока не установлено.'],
      ['belladonna_invoice', 'established', 'Аптечная книга связывает покупку белладонны с офисом Блэквуда, но не называет получателя.'],
      ['belladonna_invoice', 'refuted', 'Счёт за яд не доказывает, кто именно забрал препарат и применил его.'],
      ['belladonna_invoice', 'refuted', 'Ни один из материалов этого дня сам по себе не устанавливает, кто применил яд.']
    ],
    unknown: [
      'Где находится Маркус, кому предназначен ключ и что содержится в оставленном конверте.',
      'Какую часть старой записи он изменил и что ещё скрывал двадцать лет.'
    ]
  }
};

function buildEvidenceBackedSummary(day, gameState = {}) {
  const source = DAY_SUMMARIES[day];
  if (!source) return null;
  const hasClue = typeof gameState.hasClue === 'function' ? gameState.hasClue.bind(gameState) : () => false;
  const established = [];
  const refuted = [];
  const missing = [];
  for (const [clueId, section, text] of source.facts) {
    if (hasClue(clueId)) (section === 'established' ? established : refuted).push(text);
    else if (!missing.includes(clueId)) missing.push(clueId);
  }
  return {
    title: source.title,
    established,
    refuted,
    unknown: [...source.unknown],
    missingEvidence: missing
  };
}

export function getCampaignDaySummary(day, gameState = {}, ending = null) {
  if (day >= 1 && day <= 3) return buildEvidenceBackedSummary(day, gameState);

  if (day === 4) {
    const summary = buildEvidenceBackedSummary(4, gameState);
    const hasFilm = Boolean(gameState.hasClue?.('restored_film_frame'));
    const hasRadio = Boolean(gameState.hasClue?.('port_radio_fragment'));
    const hasVerifiedLedger = Boolean(gameState.hasClue?.('port_cargo_ledger_archive'));
    if (hasVerifiedLedger) summary.established.push('Архивный экземпляр портовой книги независимо подтверждает связь компании Блэквуда с грузами и временным окном 1967 года.');
    if (hasFilm) {
      summary.established.push('Восстановленный кадр помещает Себастьяна и Каллиопу у старого причала незадолго до её смерти; это опровергает часть его алиби.');
      summary.refuted.push('Кадр плёнки не показывает момент убийства и не доказывает, кто применил яд.');
    }
    if (hasRadio) {
      summary.established.push('Фрагмент радиосвязи подтверждает движение машины и временное окно у причала.');
      summary.refuted.push('Радиозапись не устанавливает личность говорившего.');
    }
    if (!hasVerifiedLedger) summary.unknown.push('Копия грузовой книги, переданная Себастьяном, ещё не сверена с независимым архивным экземпляром.');
    if (!hasFilm && hasRadio) summary.unknown.push('Присутствие Себастьяна на кадре плёнки пока проверить нельзя: восстановленный фрагмент не получен.');
    if (hasFilm && !hasRadio) summary.unknown.push('Радиофрагмент не восстановлен, поэтому голос и точный смысл переговоров остаются неизвестными.');
    return summary;
  }

  if (day === 5 && ending === 'open_case') {
    return {
      title: 'Последний рейс · Открытое дело',
      established: [
        'Совокупность медицинских, архивных и независимых материалов поддерживает обвинение против Себастьяна.',
        'Маркус признал собственное участие в фальсификации материалов 1967 года и сокрытии плёнки.'
      ],
      refuted: [
        'Признание Маркуса не подтверждает, что он убил Гаррисона; он признал только собственные действия по сокрытию.'
      ],
      unknown: [
        'Личность звонившего с внутреннего номера 17 остаётся неустановленной, если отдельная проверка не дала ответа.'
      ]
    };
  }

  if (day === 5 && ending === 'price_of_silence') {
    return {
      title: 'Последний рейс · Цена молчания',
      established: [
        'Себастьян предложил компромисс, но не признал причастности к отравлению. Встреча с Гаррисоном и покупка белладонны подтверждаются отдельными документами, а не его словами.',
        'Маркус признал, что изменил старую запись и спрятал оригинальную плёнку.'
      ],
      refuted: [
        'Компромисс не устанавливает получателя белладонны и не доказывает, кто передал яд Гаррисону.'
      ],
      unknown: [
        'Часть материалов остаётся закрытой; публичная проверка всей цепочки не завершена.',
        'Личность звонившего с внутреннего номера 17 остаётся неустановленной, если отдельная проверка не дала ответа.'
      ]
    };
  }

  return null;
}

export function getPendingCampaignDaySummary(gameState) {
  for (let day = 1; day <= 4; day++) {
    if (gameState.hasFlag?.('campaign_day_summary_pending_' + day)) {
      return { day, ...getCampaignDaySummary(day, gameState) };
    }
  }
  return null;
}

export function dismissCampaignDaySummary(gameState, day) {
  if (!Number.isInteger(day) || day < 1 || day > 4) return false;
  const flag = 'campaign_day_summary_pending_' + day;
  if (!gameState.hasFlag?.(flag)) return false;
  gameState.clearFlag(flag);
  return true;
}
