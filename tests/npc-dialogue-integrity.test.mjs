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

test('all six case NPCs have matching character profiles and a complete first meeting', () => {
  assert.deepEqual(Object.keys(dialogues).sort(), Object.keys(characters).sort());
  assert.equal(Object.keys(dialogues).length, 6);
  for (const [npcId, npc] of Object.entries(dialogues)) {
    assert.equal(typeof npc.first_meeting?.text, 'string', npcId + ' needs a first-meeting scene');
    assert.ok(npc.first_meeting.text.trim().length > 40, npcId + ' first meeting is too short');
    assert.ok(Array.isArray(npc.first_meeting.unlocks_topics), npcId + ' must unlock topics');
    assert.deepEqual([...npc.first_meeting.unlocks_topics].sort(), Object.keys(npc.topics || {}).sort(),
      npcId + ' first meeting must unlock every authored topic');
    assert.ok(Number.isFinite(characters[npcId].initial_trust), npcId + ' needs initial trust');
    assert.ok(characters[npcId].initial_trust >= 0 && characters[npcId].initial_trust <= 100,
      npcId + ' initial trust must be between 0 and 100');
  }
});

test('NPC dialogue response IDs are unique and every dependency resolves', () => {
  const responseIds = new Set();
  const allResponses = [];
  const contradictionIds = new Set(contradictions.map(rule => rule.id));
  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      assert.ok(Array.isArray(topic.responses) && topic.responses.length > 0, npcId + '/' + topicId);
      for (const response of topic.responses) {
        assert.ok(response.id, npcId + '/' + topicId + ' response needs an id');
        assert.ok(!responseIds.has(response.id), 'duplicate response id: ' + response.id);
        responseIds.add(response.id);
        allResponses.push(response);
        if (response.gives_clue) assert.ok(clues[response.gives_clue], response.id + ' gives missing clue ' + response.gives_clue);
        if (response.requires_clue) assert.ok(clues[response.requires_clue], response.id + ' requires missing clue ' + response.requires_clue);
        if (response.requires_clues) {
          assert.ok(Array.isArray(response.requires_clues), response.id + ' requires_clues must be an array');
          for (const clueId of response.requires_clues) assert.ok(clues[clueId], response.id + ' requires missing clue ' + clueId);
        }
        if (response.requires_contradiction) {
          assert.ok(contradictionIds.has(response.requires_contradiction), response.id + ' requires missing contradiction');
        }
        if (response.min_trust != null) {
          assert.ok(Number.isFinite(response.min_trust) && response.min_trust >= 0 && response.min_trust <= 100,
            response.id + ' has invalid trust threshold');
        }
      }
    }
  }
  for (const response of allResponses) {
    if (response.requires_question) {
      assert.ok(responseIds.has(response.requires_question), response.id + ' requires missing question ' + response.requires_question);
    }
  }
});

test('dialogue initializes each NPC with profile trust and never overwrites an existing save', () => {
  const previous = {
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    save: GameState.save,
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clues: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized
  };

  try {
    GameState.relationships = {};
    GameState.npcMemory = {};
    GameState.save = () => {};
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    for (const [npcId, npc] of Object.entries(dialogues)) {
      DialogueEngine.startDialogue(npcId);
      assert.equal(NPCMemory.getTrust(npcId), characters[npcId].initial_trust, npcId + ' initial trust was ignored');
      NPCMemory.changeTrust(npcId, 5);
      DialogueEngine.startDialogue(npcId);
      assert.equal(NPCMemory.getTrust(npcId), Math.min(100, characters[npcId].initial_trust + 5),
        npcId + ' trust changed when reopening dialogue');
    }

    GameState.relationships.npc_ray_morgan = { trust: 73, met: true };
    DialogueEngine.startDialogue('npc_ray_morgan');
    assert.equal(NPCMemory.getTrust('npc_ray_morgan'), 73, 'existing save trust must be preserved');
  } finally {
    GameState.relationships = previous.relationships;
    GameState.npcMemory = previous.npcMemory;
    GameState.save = previous.save;
    DialogueEngine._dialogues = previous.dialogues;
    DialogueEngine._characters = previous.characters;
    DialogueEngine._clues = previous.clues;
    DialogueEngine._contradictionRules = previous.rules;
    DialogueEngine._initialized = previous.initialized;
  }
});


test('Anna separates the last-seen account from the physical contents of Markus’s box', () => {
  const lastSeen = dialogues.npc_anna_holt.topics.about_markus.responses.find(r => r.id === 'anna_markus_last_seen');
  const box = dialogues.npc_anna_holt.topics.about_box.responses.find(r => r.id === 'anna_box_contents');
  assert.equal(lastSeen.gives_clue, 'anna_markus_items');
  assert.equal(box.gives_clue, 'anna_box_contents');
  assert.notEqual(lastSeen.gives_clue, box.gives_clue);
  assert.match(clues.anna_box_contents.description, /не раскрывает назначение ключа/);
});


test('all critical choice branches resolve to complete authored outcomes and valid rewards', () => {
  const choiceIds = new Set();
  let choiceCount = 0;

  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [nodeId, node] of Object.entries(npc)) {
      if (!Array.isArray(node.choices)) continue;
      assert.ok(typeof node.trigger_question === 'string' && node.trigger_question,
        npcId + '/' + nodeId + ' needs a trigger question');
      assert.ok(Object.values(npc.topics || {}).some(topic =>
        topic.responses.some(response => response.id === node.trigger_question)),
      npcId + '/' + nodeId + ' trigger question must be authored in an NPC topic');

      for (const choice of node.choices) {
        choiceCount++;
        assert.ok(choice.id && !choiceIds.has(choice.id), 'critical choice IDs must be unique: ' + choice.id);
        choiceIds.add(choice.id);
        assert.ok(typeof choice.text === 'string' && choice.text.trim().length > 10,
          npcId + '/' + choice.id + ' needs player-facing choice text');
        assert.ok(typeof choice.memory_set === 'string' && choice.memory_set.trim(),
          npcId + '/' + choice.id + ' needs a persistent decision flag');
        assert.ok(Number.isFinite(choice.effects?.trust) && choice.effects.trust >= -100 && choice.effects.trust <= 100,
          npcId + '/' + choice.id + ' needs a bounded trust consequence');

        const outcome = npc[choice.next_dialogue];
        assert.ok(outcome && typeof outcome.text === 'string' && outcome.text.trim().length > 20,
          npcId + '/' + choice.id + ' points to a missing or incomplete outcome');
        if (outcome.adds_note) {
          assert.ok(typeof outcome.adds_note.title === 'string' && outcome.adds_note.title.trim(),
            npcId + '/' + choice.id + ' note needs a title');
          assert.ok(typeof outcome.adds_note.text === 'string' && outcome.adds_note.text.trim(),
            npcId + '/' + choice.id + ' note needs text');
        }
        if (outcome.gives_clue) {
          assert.ok(clues[outcome.gives_clue], npcId + '/' + choice.id + ' references missing clue ' + outcome.gives_clue);
        }
      }
    }
  }

  assert.equal(choiceCount, 14, 'all 14 authored critical choice branches must be covered');
});


test('social relationship discoveries are explicit, source-backed and attached to the correct NPC', () => {
  const discoveries = [];
  const types = new Set(['family','colleague','friend','rival','debt','protective','romantic','unknown']);
  const statuses = new Set(['active','strained','broken','uncertain']);

  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      for (const response of topic.responses || []) {
        if (!response.discovers_social_tie) continue;
        const tie = response.discovers_social_tie;
        assert.equal(tie.fromNpcId, npcId, npcId + '/' + response.id + ' tie must originate from the speaking NPC');
        assert.ok(typeof tie.toNpcId === 'string' && tie.toNpcId.trim());
        assert.notEqual(tie.fromNpcId, tie.toNpcId);
        assert.ok(types.has(tie.type));
        assert.ok(statuses.has(tie.status));
        assert.ok(typeof tie.basis === 'string' && tie.basis.trim());
        assert.ok(Array.isArray(tie.sourceRefs) && tie.sourceRefs.includes('dialogue:' + npcId + ':' + response.id));
        discoveries.push(tie);
      }
    }
  }

  assert.equal(discoveries.length, 2, 'only the two explicitly established family relationships are currently discoverable');
});


test('NPC interaction events are authored as attributed, unverified testimony with source references', () => {
  const events = [];
  for (const [npcId, npc] of Object.entries(dialogues)) {
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      for (const response of topic.responses || []) {
        if (!response.discovers_social_event) continue;
        const event = response.discovers_social_event;
        assert.ok(event.id && event.id.trim());
        assert.equal(event.reportedByNpcId, npcId);
        assert.ok([event.fromNpcId, event.toNpcId].includes(npcId));
        assert.notEqual(event.fromNpcId, event.toNpcId);
        assert.ok(event.description && event.description.trim());
        assert.ok(event.timeLabel && event.timeLabel.trim());
        assert.equal(event.sourceType, 'interview');
        assert.equal(event.certainty, 'unverified',
          'a participant account must not become an established fact automatically');
        assert.deepEqual(event.sourceRefs, ['dialogue:' + npcId + ':' + response.id]);
        events.push(event);
      }
    }
  }
  assert.equal(events.length, 2,
    'only the two explicitly authored NPC interaction accounts are currently recorded');
});


test('Ray’s promised call-log check is recorded as fulfilled only by the authored evidence response', () => {
  const response = dialogues.npc_ray_morgan.topics.about_case.responses
    .find(item => item.id === 'inspect_incoming_calls');
  assert.ok(response, 'the call-log evidence response must exist');
  assert.equal(response.requires_flag, 'ray_promised_check_calls');
  assert.equal(response.memory_set, 'ray_check_calls_fulfilled');

  const previous = {
    currentNPC: DialogueEngine._currentNPC,
    asked: DialogueEngine._askedQuestions,
    relationships: GameState.relationships,
    npcMemory: GameState.npcMemory,
    currentCase: GameState.currentCase
  };
  try {
    GameState.relationships = { npc_ray_morgan: { trust: 50, met: true } };
    GameState.npcMemory = {
      npc_ray_morgan: {
        met: true,
        flags: { ray_promised_check_calls: true },
        conversationCount: 1,
        questionCount: 0,
        unlockedTopics: [],
        askedQuestions: ['confront_report_timing'],
        criticalChoiceMade: false,
        interviewHistory: []
      }
    };
    GameState.currentCase = { id: 'case_001', clues: [], suspects: [], timeline: [], hypotheses: [] };
    DialogueEngine._currentNPC = 'npc_ray_morgan';
    DialogueEngine._askedQuestions = ['confront_report_timing'];
    assert.equal(DialogueEngine._isResponseAvailable(response), true);
    assert.equal(NPCMemory.hasFlag('npc_ray_morgan', 'ray_check_calls_fulfilled'), false);
  } finally {
    DialogueEngine._currentNPC = previous.currentNPC;
    DialogueEngine._askedQuestions = previous.asked;
    GameState.relationships = previous.relationships;
    GameState.npcMemory = previous.npcMemory;
    GameState.currentCase = previous.currentCase;
  }
});
