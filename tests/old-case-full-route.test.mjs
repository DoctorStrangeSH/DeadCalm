import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOldCaseCrosscheck, recordOldCaseReading } from '../src/js/systems/old-case-crosscheck.js';
import { assessOldCaseClosure, recordOldCaseClosure } from '../src/js/systems/old-case-closure.js';
import { assessOldCaseOrder, recordOldCaseOrderInterpretation } from '../src/js/systems/old-case-order.js';
import { assessOldCaseSignature, recordOldCaseSignatureAction } from '../src/js/systems/old-case-signature.js';
import { assessOldCaseFollowUp, recordOldCaseFollowUp } from '../src/js/systems/old-case-follow-up.js';
import { resolveMorganOldCaseApproach } from '../src/js/systems/old-case-morgan.js';
import { planMorganRevisit, recordMorganRevisit } from '../src/js/systems/old-case-morgan-revisit.js';
import { assessOldCaseSources, recordOldCaseSourceReading } from '../src/js/systems/old-case-source-audit.js';
import { assessOldCaseWitnesses, recordOldCaseWitnessReading } from '../src/js/systems/old-case-witnesses.js';
import { recordOldCaseWitnessFollowUp } from '../src/js/systems/old-case-witness-follow-up.js';
import { assessOldCaseDiscrepancy, recordOldCaseDiscrepancy } from '../src/js/systems/old-case-discrepancy.js';
import { assessOldCasePortLog, recordOldCasePortLogReading } from '../src/js/systems/old-case-port-log.js';
import { assessOldCaseWaybill, recordOldCaseWaybillReading } from '../src/js/systems/old-case-waybill.js';
import { planMorganBriefing, recordMorganBriefing } from '../src/js/systems/old-case-morgan-briefing.js';
import { getOldCaseNavigation } from '../src/js/systems/old-case-navigation.js';

for (const signatureRoute of ['request_specialist', 'formal_inquiry']) {
  for (const morganTone of ['careful_request', 'unsupported_accusation']) {
    test(`архивное расследование проходимо: ${signatureRoute} / ${morganTone}`, () => {
      const evidence = new Set(['judge_notes', 'old_case_details']);
      const has = id => evidence.has(id);
      const flags = {};
      const crosscheck = assessOldCaseCrosscheck(has, [{ kind: 'next_lead', targetClueId: 'judge_notes' }]);
      flags.court_old_case_reading = recordOldCaseReading('historical_warning', crosscheck);

      for (const id of ['old_case_closure_register', 'old_case_archive_inventory']) evidence.add(id);
      flags.court_old_case_closure_review = recordOldCaseClosure(assessOldCaseClosure(has, flags.court_old_case_reading));
      assert.ok(flags.court_old_case_closure_review);

      for (const id of ['old_case_original_order', 'old_case_authority_roster']) evidence.add(id);
      flags.court_old_case_order_interpretation = recordOldCaseOrderInterpretation('signature_unverified',
        assessOldCaseOrder(has, flags.court_old_case_closure_review));
      assert.ok(flags.court_old_case_order_interpretation);

      for (const id of ['old_case_order_physical_original', 'old_case_signature_samples']) evidence.add(id);
      flags.court_old_case_signature_action = recordOldCaseSignatureAction(signatureRoute,
        assessOldCaseSignature(has, flags.court_old_case_order_interpretation));
      const pending = assessOldCaseFollowUp(flags.court_old_case_signature_action, has);
      assert.equal(pending.found, false);
      evidence.add(pending.clueId);
      flags.court_old_case_follow_up = recordOldCaseFollowUp(assessOldCaseFollowUp(flags.court_old_case_signature_action, has));
      assert.ok(flags.court_old_case_follow_up);

      flags.court_old_case_morgan_approach = resolveMorganOldCaseApproach(morganTone, flags.court_old_case_follow_up);
      const revisit = planMorganRevisit(flags.court_old_case_morgan_approach);
      assert.ok(revisit);
      evidence.add(revisit.clueId);
      flags.court_old_case_morgan_revisit = recordMorganRevisit(revisit, has);
      assert.ok(flags.court_old_case_morgan_revisit);

      flags.court_old_case_source_audit = recordOldCaseSourceReading('partial_confirmation', assessOldCaseSources(has));
      for (const id of ['old_case_clerk_statement', 'old_case_dock_statement']) evidence.add(id);
      flags.court_old_case_witness_reading = recordOldCaseWitnessReading('direct_only',
        assessOldCaseWitnesses(has, flags.court_old_case_source_audit));
      flags.court_old_case_witness_follow_up = recordOldCaseWitnessFollowUp('dock_origin', flags.court_old_case_witness_reading, has);
      flags.court_old_case_discrepancy = recordOldCaseDiscrepancy('source_gap',
        assessOldCaseDiscrepancy(has, flags.court_old_case_witness_reading, flags.court_old_case_witness_follow_up));

      const port = assessOldCasePortLog(has, flags.court_old_case_discrepancy);
      assert.equal(port.found, false);
      evidence.add('old_case_port_visitor_log');
      flags.court_old_case_port_log_reading = recordOldCasePortLogReading('limited_record', assessOldCasePortLog(has, flags.court_old_case_discrepancy));
      assert.ok(flags.court_old_case_port_log_reading);

      const waybill = assessOldCaseWaybill(has, flags.court_old_case_port_log_reading);
      assert.equal(waybill.found, false);
      evidence.add('old_case_port_waybill');
      flags.court_old_case_waybill_reading = recordOldCaseWaybillReading('unmatched_trip',
        assessOldCaseWaybill(has, flags.court_old_case_port_log_reading));
      assert.ok(flags.court_old_case_waybill_reading);

      const briefing = planMorganBriefing(has, flags.court_old_case_waybill_reading, flags.court_old_case_morgan_approach);
      assert.ok(briefing);
      flags.court_old_case_morgan_briefing = recordMorganBriefing('share_limits', briefing, flags.court_old_case_morgan_approach, 0);
      assert.ok(flags.court_old_case_morgan_briefing);

      const nav = getOldCaseNavigation(flags, has);
      assert.equal(nav.stages.length, 13);
      assert.equal(nav.completed, 13);
      assert.equal(nav.next, null);
    });
  }
}
