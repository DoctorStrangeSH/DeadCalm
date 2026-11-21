import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from '../src/js/core/state.js';
import { Storage } from '../src/js/core/storage.js';
import { DialogueEngine } from '../src/js/systems/dialogue.js';
import { NPCMemory } from '../src/js/systems/npc-memory.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');
const characters = readJson('../src/data/characters.json');
const clues = readJson('../src/data/clues.json');
const contradictions = readJson('../src/data/contradictions.json');

test('all non-terminal critical NPC choices produce one authored return reaction on the next meeting', () => {
  const stateKeys = [
    'player', 'currentCase', 'campaign', 'flags', 'relationships', 'npcMemory',
    'socialGraph', 'knowledgeLedger', 'npcDailyLife', 'miniGameProgress',
    'notebook', 'settings', 'saveBlocked', 'save'
  ];
  const previousState = Object.fromEntries(stateKeys.map(key => [key, GameState[key]]));
  const previousStorageSave = Storage.save;
  const previousDialogue = {
    dialogues: DialogueEngine._dialogues,
    characters: DialogueEngine._characters,
    clues: DialogueEngine._clues,
    rules: DialogueEngine._contradictionRules,
    initialized: DialogueEngine._initialized,
    currentNPC: DialogueEngine._currentNPC,
    currentNode: DialogueEngine._currentNode,
    asked: DialogueEngine._askedQuestions,
    unlocked: DialogueEngine._unlockedTopics
  };

  try {
    GameState.save = () => {};
    Storage.save = () => true;
    DialogueEngine._dialogues = dialogues;
    DialogueEngine._characters = characters;
    DialogueEngine._clues = clues;
    DialogueEngine._contradictionRules = contradictions;
    DialogueEngine._initialized = true;

    let tested = 0;
    for (const [npcId, npc] of Object.entries(dialogues)) {
      for (const [nodeId, node] of Object.entries(npc)) {
        if (!Array.isArray(node.choices) || !node.trigger_question) continue;
        const reactions = node.return_reactions || [];
        for (const choice of node.choices) {
          const outcome = npc[choice.next_dialogue];
          const isTerminal = !!(outcome?.memory_set === 'lydia_refuses' || outcome?.memory_set === 'ray_hostile');
          const reaction = reactions.find(item => item.choice_id === choice.id);

          if (isTerminal) {
            assert.equal(reaction, undefined, npcId + '/' + choice.id + ' is an intentional terminal refusal');
            continue;
          }

          assert.ok(reaction, npcId + '/' + nodeId + '/' + choice.id + ' needs a return reaction');
          assert.equal(reaction.required_flag, choice.memory_set);
          assert.ok(reaction.text.length >= 40);
          assert.ok(reaction.id && reaction.consumed_flag);

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

          DialogueEngine.reset();
          const firstMeeting = DialogueEngine.startDialogue(npcId);
          assert.equal(firstMeeting.type, 'first_meeting');
          const trigger = DialogueEngine.askQuestion(node.trigger_question);
          assert.equal(trigger?.type, 'critical_choice', npcId + '/' + choice.id);
          const result = DialogueEngine.makeCriticalChoice(choice.id);
          assert.equal(result?.type, 'critical_result', npcId + '/' + choice.id);
          assert.equal(NPCMemory.hasFlag(npcId, choice.memory_set), true);

          const snapshot = GameState.export();
          GameState.npcMemory = {};
          GameState.relationships = {};
          assert.equal(GameState.importSave(snapshot), true, npcId + '/' + choice.id + ' restore');

          DialogueEngine.reset();
          const returnNode = DialogueEngine.startDialogue(npcId);
          assert.equal(returnNode?.type, 'simple', npcId + '/' + choice.id);
          assert.equal(returnNode?.isReturnReaction, true, npcId + '/' + choice.id);
          assert.equal(returnNode?.reactionId, reaction.id);
          assert.equal(returnNode?.text, reaction.text);
          assert.equal(NPCMemory.hasFlag(npcId, reaction.consumed_flag), true);

          const nextMeeting = DialogueEngine.startDialogue(npcId);
          assert.notEqual(nextMeeting?.isReturnReaction, true,
            npcId + '/' + choice.id + ' return reaction must be one-time');
          tested++;
        }
      }
    }
    assert.equal(tested, 12, '12 non-terminal choices should have authored return reactions');
  } finally {
    Storage.save = previousStorageSave;
    Object.assign(GameState, previousState);
    Object.assign(DialogueEngine, {
      _dialogues: previousDialogue.dialogues,
      _characters: previousDialogue.characters,
      _clues: previousDialogue.clues,
      _contradictionRules: previousDialogue.rules,
      _initialized: previousDialogue.initialized,
      _currentNPC: previousDialogue.currentNPC,
      _currentNode: previousDialogue.currentNode,
      _askedQuestions: previousDialogue.asked,
      _unlockedTopics: previousDialogue.unlocked
    });
  }
});
