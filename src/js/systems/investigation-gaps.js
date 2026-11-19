import { auditHypothesisEvidence } from './hypotheses.js';

const markers = [
  [/пока нет независимого подтверждения|пока подтвержден[оа] только собственными словами|подтвержден[оа] лишь её словами|подтвержден[оа] лишь его словами/i, 'Показания без независимого подтверждения', 'Эта часть рассказа пока опирается на слова свидетеля. Отсутствие подтверждения не доказывает, что свидетель лжёт.'],
  [/не позволяет установить личность|не устанавливает личность|не доказывает, кто|личность .* не установлена/i, 'Личность участника не установлена', 'Документ описывает событие, но не устанавливает, кто именно его совершил.'],
  [/ещё нужно проверять|требует независимой проверки|нужно проверить выдачу|нужно проверить .* подписи/i, 'Требуется дополнительная проверка', 'В самом документе отмечено обстоятельство, которое ещё не сверено независимо.']
];

export function buildInvestigationGaps(currentCase) {
  const discovered = Array.isArray(currentCase?.clues) ? currentCase.clues.filter(clue => clue?.id) : [];
  if (!discovered.some(clue => clue.id === 'reader_reconstructed_timeline')) return [];
  const gaps = []; const seen = new Set();
  const add = (id, title, detail) => { if (!seen.has(id)) { seen.add(id); gaps.push({ id, title, detail }); } };
  for (const hypothesis of (Array.isArray(currentCase.hypotheses) ? currentCase.hypotheses : [])) {
    const audit = auditHypothesisEvidence(hypothesis, discovered);
    const label = String(hypothesis.title || 'Без названия');
    if (!audit.attached) add('empty:' + hypothesis.id, 'Версия «' + label + '» пока без опорных улик', 'В сохранённом обосновании нет доступных прикреплённых материалов. Это предположение, а не установленный факт.');
    if (audit.missing) add('missing:' + hypothesis.id, 'В версии «' + label + '» есть недоступные ссылки', 'Часть ранее прикреплённых материалов недоступна. Их названия и содержание не раскрываются.');
    if (audit.unknownSources) add('origin:' + hypothesis.id, 'Не установлено происхождение части материалов версии «' + label + '»', 'У ' + audit.unknownSources + ' доступных улик не указан проверяемый источник.');
    for (const group of audit.sharedSources) add('shared:' + hypothesis.id + ':' + group.label.toLowerCase(), 'Несколько материалов версии «' + label + '» имеют общий источник', 'Совпадающее происхождение: «' + group.label + '». Эти документы не являются независимыми подтверждениями друг друга.');
    const origins = new Set(discovered.filter(clue => (hypothesis.clueIds || []).includes(clue.id)).map(clue => typeof clue.source === 'string' ? clue.source.trim().toLowerCase() : '').filter(Boolean));
    if (audit.attached > 1 && origins.size < 2) add('independent:' + hypothesis.id, 'Недостаточно независимых источников для версии «' + label + '»', 'Среди доступных материалов пока нельзя выделить два подтверждения с явно различимым происхождением. Это не опровержение версии.');
  }
  for (const clue of discovered) {
    if (clue.category !== 'testimony') continue;
    const description = String(clue.description || '');
    markers.forEach((marker, index) => { if (marker[0].test(description)) add('witness:' + clue.id + ':' + index, marker[1] + ': ' + clue.name, marker[2]); });
    if (/не позволяет установить|не устанавливает личность|не доказывает, кто|неизвестно, кто/i.test(description)) add('question:' + clue.id, 'Открытый вопрос по материалу «' + clue.name + '»', 'Найденный документ прямо указывает на обстоятельство, которое он сам по себе не позволяет установить.');
  }
  return gaps;
}
