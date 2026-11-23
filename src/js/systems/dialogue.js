import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';
import { NPCMemory } from './npc-memory.js';
import { resolveDialogueReaction } from './dialogue-reactions.js';
import { hasDiscoveredContradiction } from './contradictions.js';

export var DialogueEngine = {
  _dialogues: null,
  _characters: null,
  _clues: null,
  _contradictionRules: [],
  _currentNPC: null,
  _currentNode: null,
  _pendingCriticalChoice: null,
  _unlockedTopics: [],
  _askedQuestions: [],
  _initialized: false,

  async init() {
    if (this._initialized) return;
    try {
      var results = await Promise.all([
        this._loadJSON('src/data/dialogues.json'),
        this._loadJSON('src/data/characters.json'),
        this._loadJSON('src/data/clues.json'),
        this._loadJSON('src/data/contradictions.json').catch(() => [])
      ]);
      this._dialogues = results[0];
      this._characters = results[1];
      this._clues = results[2];
      this._contradictionRules = Array.isArray(results[3]) ? results[3] : [];
      this._initialized = true;
      console.log('[Dialogue] Система диалогов готова');
      console.log('[Dialogue] NPC с диалогами: ' + Object.keys(this._dialogues).length);
    } catch (error) {
      console.error('[Dialogue] Ошибка:', error);
      this._dialogues = {};
      this._characters = {};
      this._clues = {};
      this._contradictionRules = [];
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
    this._pendingCriticalChoice = null;
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
    this._pendingCriticalChoice = null;

    // Загружаем сохранённые данные
    this._askedQuestions = NPCMemory.getAskedQuestions(npcId);
    this._unlockedTopics = NPCMemory.getUnlockedTopics(npcId);

    var npcData = this._dialogues?.[npcId];
    if (!npcData) {
      console.warn('[Dialogue] Нет данных для NPC: ' + npcId);
      return null;
    }

    var character = this.getCharacter(npcId);
    if (!GameState.ensureRelationship(npcId, character?.initial_trust ?? 50)) {
      return {
        type: 'simple',
        text: 'Не удалось сохранить начало разговора. Ваш прогресс не изменён — проверьте хранилище браузера и попробуйте ещё раз.',
        saveError: true
      };
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

      // Commit the meeting, its counter and initial topics as one atomic save.
      // A separate markMet() here would persist and count the same meeting twice.
      var firstNode = npcData.first_meeting;
      const initialTopics = Array.isArray(firstNode?.unlocks_topics) ? firstNode.unlocks_topics : [];
      if (!NPCMemory.commitFirstMeeting(npcId, initialTopics)) {
        return {
          type: 'simple',
          text: 'Не удалось сохранить первую встречу. Персонаж не отметил разговор как состоявшийся — попробуйте начать его ещё раз.',
          saveError: true
        };
      }
      this._unlockedTopics = NPCMemory.getUnlockedTopics(npcId);
      console.log('[Dialogue] Разблокированы темы: ' + this._unlockedTopics.join(', '));
      return this._formatFirstMeeting(firstNode, npcId);
    }

    // ПОВТОРНАЯ ВСТРЕЧА
    const returnReaction = this._getPendingReturnReaction(npcData);
    if (returnReaction) return returnReaction;

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
      const accessibleResponses = topic.responses.filter(r => self._isResponseAvailable(r));
      accessibleResponses.forEach(function(r) {
        if (self._askedQuestions.indexOf(r.id) !== -1) {
          askedInTopic++;
        }
      });

      var totalInTopic = accessibleResponses.length;
      var allAsked = askedInTopic >= totalInTopic;

      console.log('[Dialogue]   Тема ' + topicId + ': задано ' + askedInTopic + '/' + totalInTopic + ' (исчерпана: ' + allAsked + ')');

      // Возвращаем тему, если не все вопросы заданы
      return !allAsked;
    });

    return available;
  },

  _isResponseAvailable(response) {
    if (response.requires_question && !this._askedQuestions.includes(response.requires_question)) return false;
    if (response.requires_flag && !NPCMemory.hasFlag(this._currentNPC, response.requires_flag)) return false;
    if (response.requires_clue && !GameState.hasClue(response.requires_clue)) return false;
    if (Array.isArray(response.requires_clues) && !response.requires_clues.every(clueId => GameState.hasClue(clueId))) return false;
    if (response.min_trust != null && NPCMemory.getTrust(this._currentNPC) < response.min_trust) return false;
    return hasDiscoveredContradiction(response.requires_contradiction,
      GameState.currentCase.hypotheses, GameState.currentCase.clues, this._contradictionRules);
  },

  selectTopic(topicId) {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    var topic = npcData.topics?.[topicId];
    if (!topic || !this._unlockedTopics.includes(topicId)) {
      console.warn('[Dialogue] Тема не найдена или ещё не открыта: ' + topicId);
      return null;
    }

    // Moving away from the active choice screen invalidates its one-time prompt.
    this._pendingCriticalChoice = null;
    var self = this;
    var unansweredQuestions = topic.responses.filter(function(r) {
      return self._askedQuestions.indexOf(r.id) === -1 && self._isResponseAvailable(r);
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

  _recordDiscoveredSocialTie(questionId) {
    const discoveries = {
      'her_background': {
        npcId: 'npc_lydia_winter',
        otherNpcId: 'npc_gabriel',
        type: 'family',
        basis: 'Лидия прямо сообщает, что Габриэль — её брат.',
        sourceRefs: ['dialogue:npc_lydia_winter:her_background']
      },
      'anna_markus_last_seen': {
        npcId: 'npc_anna_holt',
        otherNpcId: 'npc_markus_holt',
        type: 'family',
        basis: 'В разговоре об оставленных вещах Анна прямо называет Маркуса отцом.',
        sourceRefs: ['dialogue:npc_anna_holt:anna_markus_last_seen']
      }
    };
    const discovery = discoveries[questionId];
    if (!discovery || discovery.npcId !== this._currentNPC) return null;
    const existing = GameState.getSocialTies(discovery.npcId)
      .find(tie => tie.toNpcId === discovery.otherNpcId && tie.type === discovery.type);
    if (existing) return null;
    return GameState.recordSocialTie({
      ...discovery,
      status: 'active'
    });
  },

  askQuestion(questionId) {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    if (this._pendingCriticalChoice && this._pendingCriticalChoice.questionId !== questionId) {
      this._pendingCriticalChoice = null;
    }

    // Ищем ответ только в темах, которые действительно открыты игроку.
    var foundResponse = null;
    for (var topicId of this._unlockedTopics) {
      var topic = npcData.topics?.[topicId];
      if (topic?.responses) {
        var response = topic.responses.find(function(r) { return r.id === questionId; });
        if (response) {
          foundResponse = response;
          break;
        }
      }
    }

    if (!foundResponse || !this._isResponseAvailable(foundResponse)) {
      console.warn('[Dialogue] Ответ не найден или недоступен: ' + questionId);
      return null;
    }

    // Критический вопрос остаётся доступным, пока игрок не подтвердит один
    // из вариантов. Обычные вопросы после первого ответа повторно не исполняются.
    const pendingCriticalNode = foundResponse.triggers_critical
      ? npcData[foundResponse.triggers_critical]
      : null;
    const criticalFlag = foundResponse.triggers_critical
      ? 'critical_' + foundResponse.triggers_critical
      : null;
    const opensUnresolvedChoice = !!(pendingCriticalNode &&
      Array.isArray(pendingCriticalNode.choices) &&
      !NPCMemory.hasFlag(this._currentNPC, criticalFlag));

    if (this._askedQuestions.includes(questionId) && !opensUnresolvedChoice) {
      console.warn('[Dialogue] Вопрос уже был задан: ' + questionId);
      return null;
    }

    const shouldRememberQuestion = !opensUnresolvedChoice;
    console.log('[Dialogue] Задан вопрос: ' + questionId);

    // Добавляем заметку (только для важных); не отмечаем вопрос использованным,
    // если заметку не удалось сохранить.
    const noteAlreadyExists = !!(foundResponse.adds_note &&
      GameState.notebook?.some(item => item.title === foundResponse.adds_note.title));
    var addedNote = foundResponse.adds_note && this._addToNotebook(foundResponse.adds_note)
      ? foundResponse.adds_note : null;
    if (foundResponse.adds_note && !addedNote && !noteAlreadyExists) {
      return this._formatAnswer(foundResponse, { saveError: true });
    }

    // Улика считается полученной только после успешной записи сохранения.
    var addedClue = null;
    var clueSaveFailed = false;
    if (foundResponse.gives_clue) {
      var clue = this._clues?.[foundResponse.gives_clue];
      if (clue && !GameState.hasClue(clue.id)) {
        if (GameState.addClue(clue) === false) {
          clueSaveFailed = true;
          if (shouldRememberQuestion) {
            const askedIndex = this._askedQuestions.lastIndexOf(questionId);
            if (askedIndex !== -1) this._askedQuestions.splice(askedIndex, 1);
          }
        } else {
          addedClue = clue;
          console.log('[Dialogue] Выдана улика: ' + clue.name);
        }
      }
    }

    if (shouldRememberQuestion && !clueSaveFailed &&
        !NPCMemory.markQuestionAsked(this._currentNPC, questionId, {
          memorySet: foundResponse.memory_set || null,
          memoryClear: foundResponse.memory_clear || null
        })) {
      return this._formatAnswer(foundResponse, {
        addedNote,
        addedClue,
        saveError: true
      });
    }
    if (clueSaveFailed) {
      return this._formatAnswer(foundResponse, {
        addedNote: null,
        addedClue: null,
        saveError: true
      });
    }

    // Reveal a relationship only after the player has heard its explicit in-game source.
    const addedSocialTie = this._recordDiscoveredSocialTie(questionId);

    // Проверяем критический выбор
    if (foundResponse.triggers_critical) {
      var criticalNode = npcData[foundResponse.triggers_critical];
      var flagName = 'critical_' + foundResponse.triggers_critical;

      if (criticalNode && Array.isArray(criticalNode.choices) &&
          !NPCMemory.hasFlag(this._currentNPC, flagName)) {
        console.log('[Dialogue] 🔴 КРИТИЧЕСКИЙ ВЫБОР ОЖИДАЕТ РЕШЕНИЯ');
        this._pendingCriticalChoice = {
          nodeId: foundResponse.triggers_critical,
          questionId
        };
        return this._formatCriticalChoice(criticalNode, { addedNote, addedClue, addedSocialTie });
      }
    }

    return this._formatAnswer(foundResponse, { addedNote, addedClue, addedSocialTie });
  },

  makeCriticalChoice(choiceId) {
    var npcData = this._dialogues?.[this._currentNPC];
    const pending = this._pendingCriticalChoice;
    if (!npcData || !pending) return null;

    const key = pending.nodeId;
    const node = npcData[key];
    if (!node || node.trigger_question !== pending.questionId ||
        !Array.isArray(node.choices) ||
        NPCMemory.hasFlag(this._currentNPC, 'critical_' + key)) return null;

    const choice = node.choices.find(item => item.id === choiceId);
    if (!choice) return null;

    console.log('[Dialogue] Критический выбор: ' + choiceId);
          // Commit the decision, trust change and authored memory consequences together.
          const nextNode = npcData[choice.next_dialogue];
          const nextClue = nextNode?.gives_clue ? this._clues?.[nextNode.gives_clue] : null;
          if (nextNode?.gives_clue && !nextClue) {
            console.error('[Dialogue] Не найдена улика критического выбора: ' + nextNode.gives_clue);
            return this._formatCriticalChoice(node, { saveError: true });
          }
          const decision = NPCMemory.commitCriticalChoice(this._currentNPC, {
            questionId: node.trigger_question,
            choiceFlag: 'critical_' + key,
            trustDelta: choice.effects?.trust || 0,
            memorySet: choice.memory_set || null,
            memoryClear: choice.memory_clear || null,
            resultFlag: nextNode?.memory_set || null,
            note: nextNode?.adds_note || null,
            clue: nextClue
          });
          if (!decision) {
            return this._formatCriticalChoice(node, { saveError: true });
          }
          this._pendingCriticalChoice = null;
          if (node.trigger_question && !this._askedQuestions.includes(node.trigger_question)) {
            this._askedQuestions.push(node.trigger_question);
          }
          const trustBefore = decision.trustBefore;

          if (nextNode) {
            return this._formatCriticalResult(nextNode, {
              type: 'critical_result',
              tone: choice.tone,
              trustDelta: NPCMemory.getTrust(this._currentNPC) - trustBefore,
              addedNote: decision.addedNote,
              addedClue: decision.addedClue
            });
          }
    return null;
  },

  /**
   * Present discovered evidence against this NPC's recorded account.
   * The authored reaction is presentation only; evidence never writes a confession
   * or changes trust unless a separate authored choice explicitly does so.
   */
  presentEvidence({ entryId, clueIds, reason, reactionText } = {}) {
    if (!this._currentNPC || typeof reactionText !== 'string' || !reactionText.trim()) return null;
    const entry = GameState.getNpcKnowledge(this._currentNPC)
      .find(item => item.id === entryId);
    if (!entry) return null;

    const challenged = GameState.challengeNpcKnowledge({
      entryId,
      npcId: this._currentNPC,
      clueIds,
      reason
    });
    if (!challenged) {
      return {
        type: 'evidence_challenge',
        speaker: this.getCharacter(this._currentNPC)?.name || this._currentNPC,
        text: 'Не удалось зафиксировать предъявление доказательств. Сохранение не изменено — попробуйте ещё раз.',
        saveError: true
      };
    }

    return {
      type: 'evidence_challenge',
      speaker: this.getCharacter(this._currentNPC)?.name || this._currentNPC,
      text: reactionText.trim(),
      beliefState: challenged.state,
      challengedEntryId: challenged.id,
      evidenceIds: [...challenged.challengeHistory.at(-1).clueIds],
      trust: NPCMemory.getTrust(this._currentNPC),
      isEnd: true
    };
  },

  backToTopics() {
    var npcData = this._dialogues?.[this._currentNPC];
    if (!npcData) return null;

    this._pendingCriticalChoice = null;
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
    const exists = GameState.notebook.some(item => item.title === note.title);
    if (exists) return false;

    const record = {
      title: note.title,
      text: note.text,
      category: note.category || 'общее',
      timestamp: new Date().toISOString()
    };
    GameState.notebook.push(record);
    let saved = false;
    try {
      saved = GameState.save();
    } catch (error) {
      console.error('[Dialogue] Не удалось сохранить запись в блокноте:', error);
    }
    if (saved === false) {
      GameState.notebook.pop();
      return false;
    }
    return true;
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

  _formatAnswer(response, context = {}) {
    var character = this.getCharacter(this._currentNPC);
    const trust = NPCMemory.getTrust(this._currentNPC);
    return {
      type: 'answer',
      text: trust < 40 && response.answer_low_trust ? response.answer_low_trust :
        trust >= 60 && response.answer_high_trust ? response.answer_high_trust : response.answer,
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust,
      addedNote: context.addedNote || null,
      addedClue: context.addedClue || null,
      addedSocialTie: context.addedSocialTie || null,
      saveError: Boolean(context.saveError),
      canContinue: true
    };
  },

  _formatCriticalChoice(node, context = {}) {
    var character = this.getCharacter(this._currentNPC);
    return {
      type: 'critical_choice',
      text: node.text,
      speaker: character?.name || this._currentNPC,
      speakerRole: character?.role || '',
      trust: NPCMemory.getTrust(this._currentNPC),
      reaction: resolveDialogueReaction({ type: 'critical_choice' }),
      saveError: Boolean(context.saveError),
      addedNote: context.addedNote || null,
      addedClue: context.addedClue || null,
      addedSocialTie: context.addedSocialTie || null,
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
      addedNote: context.addedNote || null,
      addedClue: context.addedClue || null,
      isEnd: !!node.end
    };
  },

  _getPendingReturnReaction(npcData) {
    for (const node of Object.values(npcData || {})) {
      if (!Array.isArray(node?.return_reactions)) continue;
      for (const reaction of node.return_reactions) {
        if (!reaction || typeof reaction.text !== 'string' ||
            !reaction.required_flag || !reaction.consumed_flag) continue;
        if (!NPCMemory.hasFlag(this._currentNPC, reaction.required_flag) ||
            NPCMemory.hasFlag(this._currentNPC, reaction.consumed_flag)) continue;

        if (!NPCMemory.setFlag(this._currentNPC, reaction.consumed_flag)) {
          return {
            type: 'simple',
            text: 'Не удалось сохранить реакцию персонажа. Последствие прошлого разговора не отмечено как показанное — попробуйте встретиться ещё раз.',
            saveError: true
          };
        }
        const character = this.getCharacter(this._currentNPC);
        return {
          type: 'simple',
          text: reaction.text,
          speaker: character?.name || this._currentNPC,
          speakerRole: character?.role || '',
          trust: NPCMemory.getTrust(this._currentNPC),
          isEnd: true,
          isReturnReaction: true,
          reactionId: reaction.id
        };
      }
    }
    return null;
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
