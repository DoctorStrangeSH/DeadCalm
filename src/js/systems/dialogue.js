import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { NPCMemory } from './npc-memory.js';
import { resolveDialogueReaction } from './dialogue-reactions.js';

export var DialogueEngine = {
  _dialogues: null,
  _characters: null,
  _clues: null,
  _currentNPC: null,
  _currentNode: null,
  _unlockedTopics: [],
  _askedQuestions: [],
  _initialized: false,

  async init() {
    if (this._initialized) return;
    try {
      var results = await Promise.all([
        this._loadJSON('src/data/dialogues.json'),
        this._loadJSON('src/data/characters.json'),
        this._loadJSON('src/data/clues.json')
      ]);
      this._dialogues = results[0];
      this._characters = results[1];
      this._clues = results[2];
      this._initialized = true;
      console.log('[Dialogue] Система диалогов готова');
      console.log('[Dialogue] NPC с диалогами: ' + Object.keys(this._dialogues).length);
    } catch (error) {
      console.error('[Dialogue] Ошибка:', error);
      this._dialogues = {};
      this._characters = {};
      this._clues = {};
      this._initialized = true;
    }
  },

  async _loadJSON(path) {
    var response = await fetch(path);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  },

  reset() {
    this._currentNPC = null;
    this._currentNode = null;
    this._unlockedTopics = [];
    this._askedQuestions = [];
    console.log('[Dialogue] Внутреннее состояние сброшено');
  },

  getCharacter(npcId) {
    return this._characters?.[npcId] || null;
  },

  startDialogue(npcId) {
    if (!this._initialized) {
      console.warn('[Dialogue] Движок не инициализирован');
      return null;
    }

    this._currentNPC = npcId;

    // Загружаем сохранённые данные
    this._askedQuestions = NPCMemory.getAskedQuestions(npcId);
    this._unlockedTopics = NPCMemory.getUnlockedTopics(npcId);

    var npcData = this._dialogues?.[npcId];
    if (!npcData) {
      console.warn('[Dialogue] Нет данных для NPC: ' + npcId);
      return null;
    }

    console.log('[Dialogue] === Начало диалога с ' + npcId + ' ===');
    console.log('[Dialogue] Встречались ранее: ' + NPCMemory.hasMet(npcId));
    console.log('[Dialogue] Задано вопросов: ' + this._askedQuestions.length);
    console.log('[Dialogue] Разблокировано тем: ' + this._unlockedTopics.length);
    console.log('[Dialogue] Темы: ' + this._unlockedTopics.join(', '));
    console.log('[Dialogue] Доверие: ' + NPCMemory.getTrust(npcId) + '%');

    // Проверяем специальные условия (враждебность)
    if (npcData.refuses_to_talk && NPCMemory.hasFlag(npcId, 'lydia_refuses')) {
      console.log('[Dialogue] NPC отказывается говорить (lydia_refuses)');
      return this._formatSimpleNode(npcData.refuses_to_talk, npcId);
    }
    if (npcData.hostile && NPCMemory.hasFlag(npcId, 'ray_hostile')) {
      console.log('[Dialogue] NPC враждебен (ray_hostile)');
      return this._formatSimpleNode(npcData.hostile, npcId);
    }

    var hasMet = NPCMemory.hasMet(npcId);

    // ПЕРВАЯ ВСТРЕЧА
    if (!hasMet) {
      console.log('[Dialogue] Первая встреча!');
      NPCMemory.markMet(npcId);

      var firstNode = npcData.first_meeting;
      if (firstNode && firstNode.unlocks_topics) {
        this._unlockedTopics = firstNode.unlocks_topics.slice();
        NPCMemory.unlockTopics(npcId, firstNode.unlocks_topics);
        console.log('[Dialogue] Разблокированы темы: ' + this._unlockedTopics.join(', '));
      }
      return this._formatFirstMeeting(firstNode, npcId);
    }

    // ПОВТОРНАЯ ВСТРЕЧА
    console.log('[Dialogue] Повторная встреча');

    // Проверяем доступные темы
    var availableTopics = this._getAvailableTopics(npcData);
    console.log('[Dialogue] Доступные темы: ' + availableTopics.length);
    console.log('[Dialogue] Список: ' + availableTopics.join(', '));

    if (availableTopics.length === 0) {
      console.log('[Dialogue] Все темы исчерпаны → exhausted');
      var exhaustedNode = npcData.all_topics_exhausted;
      if (exhaustedNode) {
        return this._formatSimpleNode(exhaustedNode, npcId);
      }
      // Если нет exhausted — показываем заглушку
      return {
        type: 'simple',
        text: 'Мне больше нечего вам рассказать. По крайней мере — пока.',
        speaker: this.getCharacter(npcId)?.name || npcId,
        speakerRole: this.getCharacter(npcId)?.role || '',
        trust: NPCMemory.getTrust(npcId),
        isEnd: true
      };
    }

    return this._formatTopicSelection(npcId, availableTopics, npcData);
  },

  _getAvailableTopics(npcData) {
    var self = this;

    // Проверяем, есть ли вообще topics у NPC
    if (!npcData.topics) {
      console.warn('[Dialogue] У NPC нет тем!');
      return [];
    }

    console.log('[Dialogue] _getAvailableTopics:');
    console.log('[Dialogue] - Разблокировано: ' + self._unlockedTopics.join(', '));
    console.log('[Dialogue] - Задано вопросов: ' + self._askedQuestions.length);

    // Фильтруем темы, где остались незаданные вопросы
    var available = self._unlockedTopics.filter(function(topicId) {
      var topic = npcData.topics[topicId];

      // Если тема не существует в данных — пропускаем
      if (!topic) {
        console.warn('[Dialogue] Тема не найдена в данных: ' + topicId);
        return false;
      }

      // Если у темы нет вопросов — пропускаем
      if (!topic.responses || topic.responses.length === 0) {
        console.warn('[Dialogue] У темы нет вопросов: ' + topicId);
        return false;
      }

      // Считаем, сколько вопросов уже задано в этой теме
      var askedInTopic = 0;
      topic.responses.forEach(function(r) {
        if (self._askedQuestions.indexOf(r.id) !== -1) {
          askedInTopic++;
        }
      });

      var totalInTopic = topic.responses.length;
      var allAsked = askedInTopic >= totalInTopic;

      console.log('[Dialogue]   Тема ' + topicId + ': задано ' + askedInTopic + '/' + totalInTopic + ' (исчерпана: ' + allAsked + ')');

      // Возвращаем тему, если не все вопросы заданы
      return !allAsked;
    });

    return available;
  },

  selectTopic(topicId) {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    var topic = npcData.topics?.[topicId];
    if (!topic) {
      console.warn('[Dialogue] Тема не найдена: ' + topicId);
      return null;
    }

    var self = this;
    var unansweredQuestions = topic.responses.filter(function(r) {
      return self._askedQuestions.indexOf(r.id) === -1;
    });

    console.log('[Dialogue] Выбрана тема: ' + topicId + ', незаданных вопросов: ' + unansweredQuestions.length);

    if (unansweredQuestions.length === 0) {
      // Все вопросы заданы — возвращаемся к выбору тем
      return this._formatTopicSelection(
        this._currentNPC,
        this._getAvailableTopics(npcData),
        npcData
      );
    }

    return this._formatTopicQuestions(topic, unansweredQuestions);
  },

  askQuestion(questionId) {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    // Ищем ответ
    var foundResponse = null;
    for (var topicId in npcData.topics) {
      var topic = npcData.topics[topicId];
      if (topic.responses) {
        var response = topic.responses.find(function(r) { return r.id === questionId; });
        if (response) {
          foundResponse = response;
          break;
        }
      }
    }

    if (!foundResponse) {
      console.warn('[Dialogue] Ответ не найден для вопроса: ' + questionId);
      return null;
    }

    // Отмечаем как заданный
    this._askedQuestions.push(questionId);
    NPCMemory.markQuestionAsked(this._currentNPC, questionId);
    console.log('[Dialogue] Задан вопрос: ' + questionId);

    // Добавляем заметку (только для важных)
    if (foundResponse.adds_note) {
      this._addToNotebook(foundResponse.adds_note);
    }

    // Выдаём улику
    if (foundResponse.gives_clue) {
      var clue = this._clues?.[foundResponse.gives_clue];
      if (clue) {
        GameState.addClue(clue);
        console.log('[Dialogue] Выдана улика: ' + clue.name);
      }
    }

    // Проверяем критический выбор
    if (foundResponse.triggers_critical) {
      var criticalNode = npcData[foundResponse.triggers_critical];
      var flagName = 'critical_' + foundResponse.triggers_critical;

      if (criticalNode && !NPCMemory.hasFlag(this._currentNPC, flagName)) {
        NPCMemory.setFlag(this._currentNPC, flagName);
        console.log('[Dialogue] 🔴 КРИТИЧЕСКИЙ ВЫБОР!');
        return this._formatCriticalChoice(criticalNode);
      }
    }

    return this._formatAnswer(foundResponse);
  },

  makeCriticalChoice(choiceId) {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    for (var key in npcData) {
      var node = npcData[key];
      if (node.choices && node.trigger_question) {
        var choice = node.choices.find(function(c) { return c.id === choiceId; });
        if (choice) {
          console.log('[Dialogue] Критический выбор: ' + choiceId);
          var trustBefore = NPCMemory.getTrust(this._currentNPC);

          if (choice.effects?.trust) {
            NPCMemory.changeTrust(this._currentNPC, choice.effects.trust);
          }
          if (choice.memory_set) {
            NPCMemory.setFlag(this._currentNPC, choice.memory_set);
          }
          if (choice.memory_clear) {
            NPCMemory.clearFlag(this._currentNPC, choice.memory_clear);
          }

          var nextNode = npcData[choice.next_dialogue];
          if (nextNode) {
            if (nextNode.adds_note) this._addToNotebook(nextNode.adds_note);
            if (nextNode.gives_clue) {
              var clue = this._clues?.[nextNode.gives_clue];
              if (clue) GameState.addClue(clue);
            }
            if (nextNode.memory_set) {
              NPCMemory.setFlag(this._currentNPC, nextNode.memory_set);
            }
            return this._formatCriticalResult(nextNode, {
              type: 'critical_result',
              tone: choice.tone,
              trustDelta: NPCMemory.getTrust(this._currentNPC) - trustBefore
            });
          }
          return null;
        }
      }
    }
    return null;
  },

  backToTopics() {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    if (npcData.refuses_to_talk && NPCMemory.hasFlag(this._currentNPC, 'lydia_refuses')) {
      return this._formatSimpleNode(npcData.refuses_to_talk, this._currentNPC);
    }
    if (npcData.hostile && NPCMemory.hasFlag(this._currentNPC, 'ray_hostile')) {
      return this._formatSimpleNode(npcData.hostile, this._currentNPC);
    }

    var availableTopics = this._getAvailableTopics(npcData);
    if (availableTopics.length === 0) {
      return this._formatSimpleNode(npcData.all_topics_exhausted, this._currentNPC);
    }
    return this._formatTopicSelection(this._currentNPC, availableTopics, npcData);
  },

  _addToNotebook(note) {
    if (!GameState.notebook) GameState.notebook = [];
    var exists = GameState.notebook.some(function(n) {
      return n.title === note.title;
    });
    if (!exists) {
      GameState.notebook.push({
        title: note.title,
        text: note.text,
        category: note.category || 'общее',
        timestamp: new Date().toISOString()
      });
      GameState.save();
    }
  },

  // === ФОРМАТИРОВАНИЕ ===

  _formatFirstMeeting(node, npcId) {
    var character = this.getCharacter(npcId);
    return {
      type: 'first_meeting',
      text: node.text,
      speaker: character?.name || npcId,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(npcId)
    };
  },

  _formatTopicSelection(npcId, availableTopics, npcData) {
    var character = this.getCharacter(npcId);
    return {
      type: 'topic_selection',
      text: 'О чём вы хотите спросить?',
      speaker: character?.name || npcId,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(npcId),
      topics: availableTopics.map(function(tId) {
        var topic = npcData.topics[tId];
        return { id: tId, label: topic?.label || tId };
      }),
      canLeave: true
    };
  },

  _formatTopicQuestions(topic, questions) {
    var character = this.getCharacter(this._currentNPC);
    return {
      type: 'topic_questions',
      text: topic.intro_text || topic.text || '',
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(this._currentNPC),
      questions: questions.map(function(q) {
        return { id: q.id, text: q.question };
      }),
      canGoBack: true
    };
  },

  _formatAnswer(response) {
    var character = this.getCharacter(this._currentNPC);
    return {
      type: 'answer',
      text: response.answer,
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(this._currentNPC),
      addedNote: response.adds_note || null,
      canContinue: true
    };
  },

  _formatCriticalChoice(node) {
    var character = this.getCharacter(this._currentNPC);
    return {
      type: 'critical_choice',
      text: node.text,
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(this._currentNPC),
      reaction: resolveDialogueReaction({ type: 'critical_choice' }),
      choices: node.choices.map(function(c) {
        return { id: c.id, text: c.text, tone: c.tone || 'neutral' };
      })
    };
  },

  _formatCriticalResult(node, context = {}) {
    var character = this.getCharacter(this._currentNPC);
    return {
      type: 'critical_result',
      text: node.text,
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(this._currentNPC),
      reaction: resolveDialogueReaction(context),
      trustDelta: context.trustDelta ?? 0,
      addedNote: node.adds_note || null,
      isEnd: !!node.end
    };
  },

  _formatSimpleNode(node, npcId) {
    if (!node) return null;
    var character = this.getCharacter(npcId);
    return {
      type: 'simple',
      text: node.text,
      speaker: character?.name || npcId,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(npcId),
      isEnd: !!node.end
    };
  }
};
