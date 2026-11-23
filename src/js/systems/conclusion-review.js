import { READER_AUDIT_DOCUMENTS, assessReaderInvestigation } from './investigation-quality.js';

// A supervisor validates the submitted snapshot against the actual discovered case.
// A forged ID in an imported/edited conclusion must never count as evidence.
export function reviewReaderConclusion(
  conclusion,
  previousReviews = [],
  reviewedAt = new Date().toISOString(),
  currentCase = null,
  rules = []
) {
  if (!conclusion || conclusion.status !== 'Промежуточное заключение' ||
      !currentCase || !Array.isArray(rules)) return null;
  const past = Array.isArray(previousReviews) ? previousReviews : [];
  if (past.some(item => item.conclusionVersion === conclusion.version)) return null;

  const audit = assessReaderInvestigation(currentCase, rules, {});
  if (!audit) return null;

  const submittedDocuments = Array.isArray(conclusion.documentIds) ? conclusion.documentIds : [];
  const submittedContradictions = Array.isArray(conclusion.contradictionIds) ? conclusion.contradictionIds : [];
  const actualDocuments = new Set(audit.found);
  const actualContradictions = new Set(audit.verifiedContradictions.map(item => item.id));

  const forgedDocuments = submittedDocuments.filter(id =>
    !READER_AUDIT_DOCUMENTS.includes(id) || !actualDocuments.has(id));
  const forgedContradictions = submittedContradictions.filter(id => !actualContradictions.has(id));
  const validDocuments = new Set(submittedDocuments.filter(id =>
    READER_AUDIT_DOCUMENTS.includes(id) && actualDocuments.has(id)));
  const validContradictions = new Set(submittedContradictions.filter(id => actualContradictions.has(id)));

  const comments = [];
  const missing = READER_AUDIT_DOCUMENTS.filter(id => !validDocuments.has(id));
  if (missing.length) comments.push(`Не завершена проверка ${missing.length} архивных материалов.`);
  if (!validContradictions.size) comments.push('Ни одно расхождение ещё не подтверждено сопоставлением улик в гипотезе.');
  if (forgedDocuments.length) comments.push('В заключении есть ссылки на документы, которые не обнаружены или не входят в перечень проверки.');
  if (forgedContradictions.length) comments.push('В заключении есть противоречия, не подтверждённые текущими уликами и гипотезами.');
  comments.push('Нельзя приписывать действия конкретному человеку без доказательства личности.');

  const ready = !missing.length && validContradictions.size > 0 &&
    !forgedDocuments.length && !forgedContradictions.length;
  return {
    conclusionVersion: conclusion.version,
    reviewedAt,
    status: ready ? 'Принято как промежуточное' : 'Возвращено на уточнение',
    comments,
    finalVerdict: 'Личность исполнителя не установлена'
  };
}
