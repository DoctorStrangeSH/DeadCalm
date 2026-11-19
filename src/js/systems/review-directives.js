import { READER_AUDIT_DOCUMENTS } from './investigation-quality.js';

// A review produces a task, not new evidence or a narrative verdict.
export function planReviewDirective(review, conclusion, assigned = []) {
  if (!review || !conclusion || review.conclusionVersion !== conclusion.version) return null;
  if ((Array.isArray(assigned) ? assigned : []).some(item => item.conclusionVersion === review.conclusionVersion)) return null;
  if (review.status === 'Возвращено на уточнение') {
    const missing = READER_AUDIT_DOCUMENTS.filter(id => !(conclusion.documentIds || []).includes(id));
    return {
      conclusionVersion: review.conclusionVersion,
      kind: 'additional_check',
      targetClueId: missing[0] || null,
      text: missing.length
        ? `Поручение: проверить недостающий архивный документ (${missing.length} без сверки). Начните с доступных проверок по хронологии и журналам.`
        : 'Поручение: подтвердить хотя бы одно расхождение на доске гипотез, сопоставив оба источника.'
    };
  }
  if (review.status === 'Принято как промежуточное') return {
    conclusionVersion: review.conclusionVersion,
    kind: 'next_lead',
    targetClueId: 'judge_notes',
    text: 'Направление: вернуться к дневнику судьи и проверить упоминание дела двадцатилетней давности. Это отдельная сюжетная зацепка, не доказательство личности участника ремонта.'
  };
  return null;
}
