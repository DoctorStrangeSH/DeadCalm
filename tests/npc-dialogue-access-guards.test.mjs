import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

function preserve() {
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'save', 'saveBlocked'
  ];
  const dialogueKeys = [
    '_dialogues', '_characters', '_clues', '_contradictionRules', '_initialized',
    '_currentNPC', '_currentNode', '_pendingCriticalChoice', '_unlockedTopics', '_askedQuestions'
  ];
  return {
    state: Object.fromEntries(stateKeys.map(key => [key, GameState[key]])),
    dialogue: Object.fromEntries(dialogueKeys.map(key => [key, DialogueEngine[key]]))
  };
}

function setup() {
  GameState.save = () => true;
  GameState.saveBlocked = false;
  GameState.player = { name: 'Джон Риверс', reputation: 50 };
  GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
  GameState.campaign = { caseId: 'case_001', day: 1, completed: false, ending: null };
  GameState.flags = {};
  GameState.relationships = {};
  GameState.npcMemory = {};
  GameState.socialGraph = { ties: [], events: [] };
  GameState.knowledgeLedger = { entries: [] };
  GameState.npcDailyLife = { schedules: [], occurrences: [] };
  GameState.miniGameProgress = {};
  GameState.notebook = [];
  GameState.settings = { musicVolume: 0.5, sfxVolume: 0.7, textSpeed: 'normal' };
  Object.assign(DialogueEngine, {
    _dialogues: dialogues,
    _characters: characters,
    _clues: clues,
    _contradictionRules: contradictions,
    _initialized: true
  });
  DialogueEngine.reset();
}

function restore(previous) {
  Object.assign(GameState, previous.state);
  Object.assign(DialogueEngine, previous.dialogue);
}

test('locked NPC topics and their questions cannot be called directly', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_lydia_winter')?.type, 'first_meeting');
    assert.ok(DialogueEngine._unlockedTopics.includes('about_town'));

    DialogueEngine._unlockedTopics = DialogueEngine._unlockedTopics.filter(id => id !== 'about_town');
    assert.equal(DialogueEngine.selectTopic('about_town'), null,
      'selectTopic must reject a topic absent from the saved unlock list');
    assert.equal(DialogueEngine.askQuestion('town_history'), null,
      'askQuestion must not bypass the topic unlock list');
    assert.equal(NPCMemory.getAskedQuestions('npc_lydia_winter').includes('town_history'), false);
  } finally {
    restore(previous);
  }
});

test('an ordinary NPC question can be answered only once, including stale or repeated UI actions', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'topic_selection');

    const topic = DialogueEngine.selectTopic('about_himself');
    assert.ok(topic.questions.some(question => question.id === 'ray_background'));
    const firstAnswer = DialogueEngine.askQuestion('ray_background');
    assert.equal(firstAnswer?.type, 'answer');
    assert.equal(NPCMemory.getAskedQuestions('npc_ray_morgan').includes('ray_background'), true);

    assert.equal(DialogueEngine.askQuestion('ray_background'), null,
      'a stale click must not execute an already-consumed ordinary question again');
    assert.equal(NPCMemory.getAskedQuestions('npc_ray_morgan').filter(id => id === 'ray_background').length, 1);
  } finally {
    restore(previous);
  }
});

test('an unresolved critical choice remains replayable until the player explicitly commits it', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'topic_selection');
    assert.ok(DialogueEngine.selectTopic('about_box').questions.some(q => q.id === 'anna_box_trust'));

    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    assert.equal(NPCMemory.getAskedQuestions('npc_anna_holt').includes('anna_box_trust'), false);
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice',
      'the unresolved choice must remain available if the player closes the dialogue');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary')?.type, 'critical_result');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust'), null,
      'once committed, the trigger question must no longer reopen the choice');
  } finally {
    restore(previous);
  }
});


test('Sebastian only confirms the vial transfer after both the appointment and pharmacy record are found', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_sebastian_blackwood')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_sebastian_blackwood')?.type, 'topic_selection');

    let topic = DialogueEngine.selectTopic('about_judge');
    assert.ok(topic.questions.some(item => item.id === 'sebastian_judge'));
    assert.equal(topic.questions.some(item => item.id === 'sebastian_delivery_statement'), false);

    GameState.currentCase.clues.push({ id: 'belladonna_invoice' });
    topic = DialogueEngine.selectTopic('about_judge');
    assert.equal(topic.questions.some(item => item.id === 'sebastian_delivery_statement'), false,
      'the pharmacy record alone must not unlock the confrontation');

    GameState.currentCase.clues.push({ id: 'judge_appointment_card' });
    topic = DialogueEngine.selectTopic('about_judge');
    assert.ok(topic.questions.some(item => item.id === 'sebastian_delivery_statement'),
      'both independent prerequisites must unlock the follow-up');
    const answer = DialogueEngine.askQuestion('sebastian_delivery_statement');
    assert.equal(answer?.addedClue?.id, 'sebastian_delivery_statement');
    assert.equal(GameState.hasClue('sebastian_delivery_statement'), true);
    assert.match(answer.text, /запечатанный флакон/);
  } finally {
    restore(previous);
  }
});


test('critical NPC choices cannot be committed directly or from a stale prompt', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_anna_holt')?.type, 'topic_selection');

    const trustBefore = NPCMemory.getTrust('npc_anna_holt');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null,
      'a choice ID alone must not bypass its trigger question');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);
    assert.equal(NPCMemory.getTrust('npc_anna_holt'), trustBefore);

    assert.ok(DialogueEngine.selectTopic('about_box').questions.some(q => q.id === 'anna_box_trust'));
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');

    assert.equal(DialogueEngine.makeCriticalChoice('unknown_choice'), null,
      'a choice from outside the active prompt must be rejected without consuming the prompt');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);

    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary')?.type, 'critical_result');
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), true);
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null,
      'a resolved choice cannot be replayed after the active prompt is consumed');
  } finally {
    restore(previous);
  }
});

test('leaving or resetting a dialogue invalidates its pending critical-choice prompt', () => {
  const previous = preserve();
  try {
    setup();
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.selectTopic('about_box');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    assert.ok(DialogueEngine._pendingCriticalChoice);

    DialogueEngine.startDialogue('npc_ray_morgan');
    assert.equal(DialogueEngine._pendingCriticalChoice, null);
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);

    DialogueEngine.reset();
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);

    setup();
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.startDialogue('npc_anna_holt');
    DialogueEngine.selectTopic('about_box');
    assert.equal(DialogueEngine.askQuestion('anna_box_trust')?.type, 'critical_choice');
    DialogueEngine.selectTopic('about_markus');
    assert.equal(DialogueEngine._pendingCriticalChoice, null,
      'navigating to another topic must invalidate the old choice prompt');
    assert.equal(DialogueEngine.makeCriticalChoice('anna_respect_boundary'), null);
    assert.equal(NPCMemory.hasFlag('npc_anna_holt', 'critical_critical_choice_box'), false);
  } finally {
    restore(previous);
  }
});


test('Lydia refusal preserves access to the mandatory autopsy clue without reopening personal dialogue', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_lydia_winter')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_lydia_winter')?.type, 'topic_selection');

    assert.ok(DialogueEngine.selectTopic('about_herself').questions.some(item => item.id === 'her_background'));
    assert.equal(DialogueEngine.askQuestion('her_background')?.type, 'critical_choice');
    assert.equal(DialogueEngine.makeCriticalChoice('pressure_her')?.type, 'critical_result');
    assert.equal(NPCMemory.hasFlag('npc_lydia_winter', 'lydia_refuses'), true);

    const refusedReturn = DialogueEngine.startDialogue('npc_lydia_winter');
    assert.equal(refusedReturn?.type, 'topic_selection');
    assert.deepEqual(refusedReturn.topics.map(item => item.id), ['about_autopsy'],
      'the hostile response must expose only the essential medical topic');

    const autopsyTopic = DialogueEngine.selectTopic('about_autopsy');
    assert.deepEqual(autopsyTopic.questions.map(item => item.id), ['cause_of_death'],
      'optional personal questions must remain unavailable after the refusal');
    assert.equal(DialogueEngine.askQuestion('unusual_marks'), null,
      'the refusal must not permit unrelated questions through a stale UI action');

    const evidence = DialogueEngine.askQuestion('cause_of_death');
    assert.equal(evidence?.addedClue?.id, 'autopsy_report_01');
    assert.equal(GameState.hasClue('autopsy_report_01'), true);
    assert.equal(DialogueEngine.backToTopics()?.type, 'simple',
      'once the mandatory evidence is secured, Lydia can fully end the conversation');
  } finally {
    restore(previous);
  }
});


test('Ray hostility keeps essential case-file questions available but blocks personal and optional dialogue', () => {
  const previous = preserve();
  try {
    setup();
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'first_meeting');
    assert.equal(DialogueEngine.startDialogue('npc_ray_morgan')?.type, 'topic_selection');
    assert.ok(DialogueEngine.selectTopic('about_blackwood').questions.some(item => item.id === 'blackwood_power'));
    assert.equal(DialogueEngine.askQuestion('blackwood_power')?.type, 'critical_choice');
    assert.equal(DialogueEngine.makeCriticalChoice('report_raid')?.type, 'critical_result');
    assert.equal(NPCMemory.hasFlag('npc_ray_morgan', 'ray_hostile'), true);

    const hostileReturn = DialogueEngine.startDialogue('npc_ray_morgan');
    assert.equal(hostileReturn?.type, 'topic_selection');
    assert.deepEqual(hostileReturn.topics.map(item => item.id), ['about_case']);

    GameState.currentCase.clues.push({ ...clues.autopsy_report_01 });
    const caseTopic = DialogueEngine.selectTopic('about_case');
    assert.ok(caseTopic.questions.some(item => item.id === 'initial_report'));
    assert.ok(caseTopic.questions.some(item => item.id === 'old_case'));
    assert.equal(DialogueEngine.selectTopic('about_blackwood'), null);
    assert.equal(DialogueEngine.askQuestion('ray_background'), null);

    assert.equal(DialogueEngine.askQuestion('initial_report')?.addedClue?.id, 'patrol_initial_report');
    assert.equal(DialogueEngine.askQuestion('old_case')?.addedClue?.id, 'old_case_details');
    GameState.currentCase.hypotheses.push({
      id: 'hyp_ray_report_timing',
      title: 'Расхождение времени смерти',
      reasoning: 'Сверить предварительный рапорт с медицинским заключением.',
      clueIds: ['patrol_initial_report', 'autopsy_report_01']
    });

    const confrontation = DialogueEngine.selectTopic('about_case');
    assert.ok(confrontation.questions.some(item => item.id === 'confront_report_timing'));
    assert.equal(DialogueEngine.askQuestion('confront_report_timing')?.type, 'answer');
    const callRecord = DialogueEngine.selectTopic('about_case');
    assert.ok(callRecord.questions.some(item => item.id === 'inspect_incoming_calls'));
    assert.equal(DialogueEngine.askQuestion('inspect_incoming_calls')?.addedClue?.id, 'court_switchboard_log');
    assert.equal(GameState.hasClue('court_switchboard_log'), true);

    assert.equal(DialogueEngine.backToTopics()?.type, 'simple',
      'once the mandatory records are secured, Ray can end all remaining contact');
  } finally {
    restore(previous);
  }
});


test('all remaining critical-choice branches preserve their return reaction and required evidence access', () => {
  const previous = preserve();
  const scenarios = [
    {
      npcId: 'npc_marta_hayes',
      topicId: 'about_publication',
      triggerQuestion: 'marta_publication_risk',
      choices: [
        { choiceId: 'marta_protect_source', reactionId: 'marta_return_protected' },
        { choiceId: 'marta_demand_publish', reactionId: 'marta_return_pressured' }
      ],
      evidence: [{ topicId: 'about_source', questionId: 'marta_source_identity', clueId: 'marta_source_envelope' }]
    },
    {
      npcId: 'npc_father_thomas',
      topicId: 'about_conscience',
      triggerQuestion: 'thomas_fear',
      choices: [
        { choiceId: 'thomas_preserve_context', reactionId: 'thomas_return_respected' },
        { choiceId: 'thomas_threaten_publication', reactionId: 'thomas_return_pressured' }
      ],
      evidence: [{ topicId: 'about_letter', questionId: 'thomas_matthews_letter', clueId: 'matthews_letter' }]
    },
    {
      npcId: 'npc_sebastian_blackwood',
      topicId: 'about_judge',
      triggerQuestion: 'sebastian_judge',
      choices: [
        { choiceId: 'sebastian_request_record', reactionId: 'sebastian_return_records' },
        { choiceId: 'sebastian_reject_framing', reactionId: 'sebastian_return_challenged' }
      ],
      evidence: [
        { topicId: 'about_port', questionId: 'sebastian_port_business', clueId: 'port_cargo_ledger' },
        { topicId: 'about_calliope', questionId: 'sebastian_calliope', clueId: 'kalliopa_name' }
      ],
      prerequisites: ['belladonna_invoice', 'judge_appointment_card']
    },
    {
      npcId: 'npc_anna_holt',
      topicId: 'about_box',
      triggerQuestion: 'anna_box_trust',
      choices: [
        { choiceId: 'anna_respect_boundary', reactionId: 'anna_return_respected' },
        { choiceId: 'anna_take_box', reactionId: 'anna_return_taken' }
      ],
      evidence: [
        { topicId: 'about_markus', questionId: 'anna_markus_last_seen', clueId: 'anna_markus_items' },
        { topicId: 'about_box', questionId: 'anna_box_contents', clueId: 'anna_box_contents' }
      ]
    }
  ];

  try {
    for (const scenario of scenarios) {
      for (const branch of scenario.choices) {
        setup();
        assert.equal(DialogueEngine.startDialogue(scenario.npcId)?.type, 'first_meeting');
        assert.equal(DialogueEngine.startDialogue(scenario.npcId)?.type, 'topic_selection');
        const triggerTopic = DialogueEngine.selectTopic(scenario.topicId);
        assert.ok(triggerTopic.questions.some(item => item.id === scenario.triggerQuestion),
          scenario.npcId + ' must expose its declared critical trigger');
        assert.equal(DialogueEngine.askQuestion(scenario.triggerQuestion)?.type, 'critical_choice');
        assert.equal(DialogueEngine.makeCriticalChoice(branch.choiceId)?.type, 'critical_result');

        const reaction = DialogueEngine.startDialogue(scenario.npcId);
        assert.equal(reaction?.type, 'simple');
        assert.equal(reaction?.isReturnReaction, true);
        assert.equal(reaction?.reactionId, branch.reactionId,
          scenario.npcId + ' must show the reaction for the committed branch exactly once');

        const afterReaction = DialogueEngine.startDialogue(scenario.npcId);
        assert.equal(afterReaction?.type, 'topic_selection');
        assert.equal(afterReaction?.isReturnReaction, undefined,
          scenario.npcId + ' must not repeat an already-consumed return reaction');

        for (const clueId of scenario.prerequisites || []) {
          GameState.currentCase.clues.push({ ...clues[clueId] });
        }

        for (const evidence of scenario.evidence) {
          const topic = DialogueEngine.selectTopic(evidence.topicId);
          assert.ok(topic?.questions.some(item => item.id === evidence.questionId),
            scenario.npcId + ' / ' + branch.choiceId + ' must preserve access to ' + evidence.questionId);
          const answer = DialogueEngine.askQuestion(evidence.questionId);
          assert.equal(answer?.addedClue?.id, evidence.clueId,
            scenario.npcId + ' / ' + branch.choiceId + ' must still yield ' + evidence.clueId);
          assert.equal(GameState.hasClue(evidence.clueId), true);
        }
      }
    }
  } finally {
    restore(previous);
  }
});
