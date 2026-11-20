import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('case 001 has six authored NPC dialogue arcs with valid character and clue references', () => {
  const dialogues = readJson('../src/data/dialogues.json');
  const characters = readJson('../src/data/characters.json');
  const clues = readJson('../src/data/clues.json');
  assert.deepEqual(Object.keys(dialogues).sort(), Object.keys(characters).sort());
  assert.equal(Object.keys(dialogues).length, 6);
  for (const [npcId, npc] of Object.entries(dialogues)) {
    assert.ok(npc.first_meeting?.text, `${npcId} needs a first meeting`);
    assert.ok(Array.isArray(npc.first_meeting.unlocks_topics), `${npcId} needs authored topics`);
    for (const [topicId, topic] of Object.entries(npc.topics || {})) {
      assert.ok(topic.responses?.length, `${npcId}.${topicId} needs responses`);
      for (const response of topic.responses) {
        if (response.gives_clue) assert.ok(clues[response.gives_clue], `${npcId}.${response.id} references missing clue ${response.gives_clue}`);
      }
    }
    for (const topicId of npc.first_meeting.unlocks_topics) {
      assert.ok(npc.topics?.[topicId], `${npcId} unlocks missing topic ${topicId}`);
    }
  }
});

test('case 001 chronology contains five-day finale and no obsolete priest/mayor murder events', () => {
  const timeline = readJson('../src/data/timeline-events.json');
  const ids = timeline.events.map(event => event.id);
  assert.ok(ids.includes('event_judge_murder'));
  assert.ok(ids.includes('event_markus_missing'));
  assert.ok(ids.includes('event_final_showdown'));
  assert.ok(!ids.includes('event_priest_murder'));
  assert.ok(!ids.includes('event_mayor_murder'));
  assert.match(timeline.events.find(event => event.id === 'event_final_showdown').month, /день 5/);
});

test('conditional case locations follow the five-day story route', () => {
  const locations = readJson('../src/data/locations.json');
  assert.equal(locations.church.unlock_condition, 'day_2');
  assert.equal(locations.bar_rusty_anchor.unlock_condition, 'day_2');
  assert.equal(locations.blackwood_mansion.unlock_condition, 'day_3');
  assert.equal(locations.holt_house.unlock_condition, 'day_4');
  assert.equal(locations.port.unlock_condition, 'day_4');
});

test('case 001 evidence text does not present unsupported killer intent as fact', () => {
  const dialogueText = readFileSync(new URL('../src/data/dialogues.json', import.meta.url), 'utf8');
  const crimeScene = readFileSync(new URL('../src/js/scenes/crime-scene.js', import.meta.url), 'utf8');
  assert.doesNotMatch(dialogueText, /Все причастные мертвы|серийный убийца|Сирен/i);
  assert.doesNotMatch(crimeScene, /Убийца хотел, чтобы он знал|Он хотел, чтобы вы его нашли|этот убийца ничего не делает случайно/i);
  assert.match(crimeScene, /отпечаток не называет убийцу/);
});
