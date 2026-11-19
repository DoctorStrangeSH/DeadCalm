import { READER_AUDIT_DOCUMENTS } from './investigation-quality.js';

// A supervisor checks the sufficiency of the reasoning, never identifies a culprit.
export function reviewReaderConclusion(conclusion, previousReviews = [], reviewedAt = new Date().toISOString()) {
  if (!conclusion || conclusion.status !== 'Промежуточное заключение') return null;
  const past = Array.isArray(previousReviews) ? previousReviews : [];
  if (past.some(item => item.conclusionVersion === conclusion.version)) return null;
  const documents = new Set(conclusion.documentIds || []);
  const contradictions = new Set(conclusion.contradictionIds || []);
  const comments = [];
  const missing = READER_AUDIT_DOCUMENTS.filter(id => !documents.has(id));
  if (missing.length) comments.push(`Не завершена проверка ${missing.length} архивных материалов.`);
  if (!contradictions.size) comments.push('Ни одно расхождение ещё не подтверждено сопоставлением улик в гипотезе.');
  comments.push('Нельзя приписывать действия конкретному человеку без доказательства личности.');
  const ready = !missing.length && contradictions.size > 0;
  return {
    conclusionVersion: conclusion.version,
    reviewedAt,
    status: ready ? 'Принято как промежуточное' : 'Возвращено на уточнение',
    comments,
    finalVerdict: 'Личность исполнителя не установлена'
  };
}
