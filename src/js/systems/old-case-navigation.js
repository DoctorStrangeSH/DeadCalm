const STAGES = [
  { id: 'archive', label: 'Закрытие дела', target: 'precinct-old-case', open: ctx => !!ctx.flags.court_old_case_reading, done: ctx => !!ctx.flags.court_old_case_closure_review },
  { id: 'order', label: 'Постановление', target: 'precinct-old-case-order', open: ctx => !!ctx.flags.court_old_case_closure_review, done: ctx => !!ctx.flags.court_old_case_order_interpretation },
  { id: 'signature', label: 'Подпись', target: 'precinct-old-case-signature', open: ctx => !!ctx.flags.court_old_case_order_interpretation, done: ctx => !!ctx.flags.court_old_case_signature_action },
  { id: 'follow_up', label: 'Экспертиза', target: 'precinct-old-case-follow-up', open: ctx => !!ctx.flags.court_old_case_signature_action, done: ctx => !!ctx.flags.court_old_case_follow_up },
  { id: 'morgan', label: 'Морган', target: 'precinct-morgan-old-case', open: ctx => !!ctx.flags.court_old_case_follow_up, done: ctx => !!ctx.flags.court_old_case_morgan_approach },
  { id: 'transfer', label: 'Карточка передачи', target: 'precinct-morgan-revisit', open: ctx => !!ctx.flags.court_old_case_morgan_approach, done: ctx => !!ctx.flags.court_old_case_morgan_revisit },
  { id: 'sources', label: 'Сверка источников', target: 'precinct-source-audit', open: ctx => ctx.hasClue('old_case_transfer_card') && ctx.hasClue('old_case_closure_register') && ctx.hasClue('old_case_details'), done: ctx => !!ctx.flags.court_old_case_source_audit },
  { id: 'witnesses', label: 'Архивные свидетели', target: 'precinct-old-witnesses', open: ctx => !!ctx.flags.court_old_case_source_audit, done: ctx => !!ctx.flags.court_old_case_witness_reading },
  { id: 'recheck', label: 'Уточнение показаний', target: 'precinct-witness-follow-up', open: ctx => !!ctx.flags.court_old_case_witness_reading, done: ctx => !!ctx.flags.court_old_case_witness_follow_up },
  { id: 'discrepancy', label: 'Оценка расхождения', target: 'precinct-old-discrepancy', open: ctx => !!ctx.flags.court_old_case_witness_follow_up, done: ctx => !!ctx.flags.court_old_case_discrepancy },
  { id: 'port', label: 'Журнал порта', target: 'precinct-port-log', open: ctx => !!ctx.flags.court_old_case_discrepancy, done: ctx => !!ctx.flags.court_old_case_port_log_reading },
  { id: 'waybill', label: 'Путевой лист', target: 'precinct-waybill', open: ctx => ctx.flags.court_old_case_port_log_reading?.choice === 'limited_record', done: ctx => !!ctx.flags.court_old_case_waybill_reading },
  { id: 'briefing', label: 'Разговор с Морганом', target: 'precinct-morgan-briefing', open: ctx => ctx.flags.court_old_case_waybill_reading?.choice === 'unmatched_trip' && !!ctx.flags.court_old_case_morgan_approach, done: ctx => !!ctx.flags.court_old_case_morgan_briefing }
];

export function getOldCaseNavigation(flags = {}, hasClue = () => false) {
  const context = { flags, hasClue };
  const stages = STAGES.filter(stage => stage.open(context)).map(stage => ({
    id: stage.id, label: stage.label, target: stage.target,
    status: stage.done(context) ? 'done' : 'available'
  }));
  return { stages, completed: stages.filter(stage => stage.status === 'done').length,
    next: stages.find(stage => stage.status === 'available') || null };
}
