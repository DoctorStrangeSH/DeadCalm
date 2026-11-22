import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { Events } from '../src/js/core/events.js';

function capture() {
  return {
    socialGraph: GameState.socialGraph,
    knowledgeLedger: GameState.knowledgeLedger,
    npcDailyLife: GameState.npcDailyLife,
    saveBlocked: GameState.saveBlocked,
    storageSave: Storage.save
  };
}
function restore(previous) {
  Storage.save = previous.storageSave;
  GameState.socialGraph = previous.socialGraph;
  GameState.knowledgeLedger = previous.knowledgeLedger;
  GameState.npcDailyLife = previous.npcDailyLife;
  GameState.saveBlocked = previous.saveBlocked;
}

test('NPC world-state wrappers roll back every mutation when storage rejects a save', () => {
  const previous = capture();
  const emitted = [];
  const events = [
    'social:tie_updated', 'social:event_recorded', 'npc:knowledge_recorded',
    'npc:knowledge_updated', 'npc:schedule_updated', 'npc:occurrence_recorded'
  ];
  const unsubscribe = events.map(name => Events.on(name, payload => emitted.push({ name, payload })));

  try {
    GameState.saveBlocked = false;
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    const tiesRef = GameState.socialGraph.ties;
    const socialEventsRef = GameState.socialGraph.events;
    const knowledgeRef = GameState.knowledgeLedger.entries;
    const schedulesRef = GameState.npcDailyLife.schedules;
    const occurrencesRef = GameState.npcDailyLife.occurrences;
    Storage.save = () => false;

    assert.equal(GameState.recordSocialTie({
      fromNpcId: 'npc_a', toNpcId: 'npc_b', type: 'colleague',
      status: 'strained', basis: 'A documented shared shift.'
    }), null);
    assert.equal(GameState.recordSocialEvent({
      fromNpcId: 'npc_a', toNpcId: 'npc_b',
      description: 'They argued outside the station.'
    }), null);
    assert.equal(GameState.recordNpcKnowledge({
      npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'interview',
      provenance: 'A recorded witness interview.'
    }), null);
    assert.equal(GameState.updateNpcKnowledgeState('missing', 'disputed', 'A conflicting report.'), null);
    assert.equal(GameState.setNpcSchedule({
      id: 'schedule_a', npcId: 'npc_a', activity: 'work',
      startMinute: 600, endMinute: 900, days: [1],
      locationId: 'station', basis: 'An authored work schedule.'
    }), null);
    assert.equal(GameState.recordNpcOccurrence({
      id: 'occurrence_a', npcId: 'npc_a', scheduleId: 'schedule_a',
      day: 1, minute: 700, locationId: 'station',
      description: 'A witnessed meeting.', basis: 'A signed visitor log.'
    }), null);

    assert.equal(GameState.socialGraph.ties, tiesRef);
    assert.equal(GameState.socialGraph.events, socialEventsRef);
    assert.equal(GameState.knowledgeLedger.entries, knowledgeRef);
    assert.equal(GameState.npcDailyLife.schedules, schedulesRef);
    assert.equal(GameState.npcDailyLife.occurrences, occurrencesRef);
    assert.deepEqual(GameState.socialGraph, { ties: [], events: [] });
    assert.deepEqual(GameState.knowledgeLedger, { entries: [] });
    assert.deepEqual(GameState.npcDailyLife, { schedules: [], occurrences: [] });
    assert.deepEqual(emitted, []);
  } finally {
    unsubscribe.forEach(off => off());
    restore(previous);
  }
});

test('NPC world-state wrappers emit events only after a successful persisted mutation', () => {
  const previous = capture();
  const emitted = [];
  const events = [
    'social:tie_updated', 'social:event_recorded', 'npc:knowledge_recorded',
    'npc:knowledge_updated', 'npc:schedule_updated', 'npc:occurrence_recorded'
  ];
  const unsubscribe = events.map(name => Events.on(name, payload => emitted.push({ name, payload })));

  try {
    GameState.saveBlocked = false;
    GameState.socialGraph = { ties: [], events: [] };
    GameState.knowledgeLedger = { entries: [] };
    GameState.npcDailyLife = { schedules: [], occurrences: [] };
    Storage.save = () => true;

    assert.ok(GameState.recordSocialTie({
      fromNpcId: 'npc_a', toNpcId: 'npc_b', type: 'colleague',
      status: 'active', basis: 'A signed staff record.'
    }));
    assert.ok(GameState.recordSocialEvent({
      fromNpcId: 'npc_a', toNpcId: 'npc_b',
      description: 'They met at the archive.'
    }));
    const knowledge = GameState.recordNpcKnowledge({
      npcId: 'npc_a', claimRef: 'claim_1', sourceType: 'interview',
      provenance: 'A recorded witness interview.'
    });
    assert.ok(knowledge);
    assert.ok(GameState.updateNpcKnowledgeState(
      knowledge.id, 'corroborated', 'A second independent document confirms it.'
    ));
    const schedule = GameState.setNpcSchedule({
      id: 'schedule_a', npcId: 'npc_a', activity: 'work',
      startMinute: 600, endMinute: 900, days: [1],
      locationId: 'station', basis: 'An authored work schedule.'
    });
    assert.ok(schedule);
    assert.ok(GameState.recordNpcOccurrence({
      id: 'occurrence_a', npcId: 'npc_a', scheduleId: 'schedule_a',
      day: 1, minute: 700, locationId: 'station',
      description: 'A witnessed meeting.', basis: 'A signed visitor log.'
    }));

    assert.equal(emitted.length, 6);
    assert.deepEqual(emitted.map(item => item.name), events);
    assert.equal(GameState.knowledgeLedger.entries[0].state, 'corroborated');
    assert.equal(GameState.npcDailyLife.occurrences.length, 1);
  } finally {
    unsubscribe.forEach(off => off());
    restore(previous);
  }
});
