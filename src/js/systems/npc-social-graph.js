const RELATION_TYPES = new Set(['family','colleague','friend','rival','debt','protective','romantic','unknown']);
const RELATION_STATUSES = new Set(['active','strained','broken','uncertain']);

export function createEmptySocialGraph() { return { ties: [], events: [] }; }

function cleanRefs(refs) {
  return Array.isArray(refs) ? [...new Set(refs.filter(ref => typeof ref === 'string' && ref.trim()))] : [];
}
function cloneRecord(record) {
  return { ...record, sourceRefs: Array.isArray(record.sourceRefs) ? [...record.sourceRefs] : [] };
}
function validTie(tie) {
  return !!tie && typeof tie.id === 'string' && !!tie.id.trim() &&
    typeof tie.fromNpcId === 'string' && !!tie.fromNpcId.trim() &&
    typeof tie.toNpcId === 'string' && !!tie.toNpcId.trim() &&
    tie.fromNpcId !== tie.toNpcId && RELATION_TYPES.has(tie.type) &&
    RELATION_STATUSES.has(tie.status) && typeof tie.basis === 'string' && !!tie.basis.trim();
}
function validEvent(event) {
  return !!event && typeof event.id === 'string' && !!event.id.trim() &&
    typeof event.fromNpcId === 'string' && !!event.fromNpcId.trim() &&
    typeof event.toNpcId === 'string' && !!event.toNpcId.trim() &&
    event.fromNpcId !== event.toNpcId && typeof event.description === 'string' && !!event.description.trim();
}
export function normalizeSocialGraph(value) {
  if (!value || typeof value !== 'object') return createEmptySocialGraph();
  return {
    ties: Array.isArray(value.ties) ? value.ties.filter(validTie).map(cloneRecord) : [],
    events: Array.isArray(value.events) ? value.events.filter(validEvent).map(cloneRecord) : []
  };
}
/** Store only an explicitly authored or source-backed connection; never infer one. */
export function upsertSocialTie(graph, input) {
  if (!graph || !Array.isArray(graph.ties) || !input || typeof input !== 'object') return null;
  const { fromNpcId, toNpcId, type, status = 'uncertain', basis } = input;
  if (typeof fromNpcId !== 'string' || !fromNpcId.trim() ||
      typeof toNpcId !== 'string' || !toNpcId.trim() || fromNpcId === toNpcId ||
      !RELATION_TYPES.has(type) || !RELATION_STATUSES.has(status) ||
      typeof basis !== 'string' || !basis.trim()) return null;
  const suppliedId = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : null;
  const index = graph.ties.findIndex(tie => suppliedId
    ? tie.id === suppliedId
    : tie.type === type && (
      (tie.fromNpcId === fromNpcId && tie.toNpcId === toNpcId) ||
      (tie.fromNpcId === toNpcId && tie.toNpcId === fromNpcId)
    ));
  const id = suppliedId || (index >= 0 ? graph.ties[index].id : [fromNpcId, toNpcId, type].join('::'));
  const tie = { id, fromNpcId, toNpcId, type, status, basis: basis.trim(),
    sourceRefs: cleanRefs(input.sourceRefs),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString() };
  if (index < 0) graph.ties.push(tie); else graph.ties[index] = tie;
  return cloneRecord(tie);
}
/** Record a concrete event without silently changing the relationship itself. */
export function appendSocialEvent(graph, input) {
  if (!graph || !Array.isArray(graph.events) || !input || typeof input !== 'object') return null;
  const { fromNpcId, toNpcId, description } = input;
  if (typeof fromNpcId !== 'string' || !fromNpcId.trim() ||
      typeof toNpcId !== 'string' || !toNpcId.trim() || fromNpcId === toNpcId ||
      typeof description !== 'string' || !description.trim()) return null;
  const event = { id: typeof input.id === 'string' && input.id.trim()
      ? input.id.trim() : 'social-event-' + (graph.events.length + 1),
    fromNpcId, toNpcId, description: description.trim(), sourceRefs: cleanRefs(input.sourceRefs),
    occurredAt: typeof input.occurredAt === 'string' ? input.occurredAt : new Date().toISOString() };
  if (graph.events.some(item => item.id === event.id)) return null;
  graph.events.push(event);
  return cloneRecord(event);
}
export function getSocialTies(graph, npcId) {
  if (!graph || !Array.isArray(graph.ties) || typeof npcId !== 'string') return [];
  return graph.ties.filter(t => t.fromNpcId === npcId || t.toNpcId === npcId).map(cloneRecord);
}
export function getSocialContext(graph, npcId) {
  const ties = getSocialTies(graph, npcId);
  const events = Array.isArray(graph?.events)
    ? graph.events.filter(e => e.fromNpcId === npcId || e.toNpcId === npcId).map(cloneRecord) : [];
  return { connectionCount: ties.length,
    strainedConnections: ties.filter(t => t.status === 'strained').length,
    brokenConnections: ties.filter(t => t.status === 'broken').length,
    uncertainConnections: ties.filter(t => t.status === 'uncertain').length,
    eventCount: events.length, ties, events };
}
