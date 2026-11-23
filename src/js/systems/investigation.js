import { GameState } from '../core/state.js';
import { Events } from '../core/events.js';

/**
 * Система расследования.
 * Проверяет связи между уликами и отслеживает прогресс.
 */
export var Investigation = {
  _cluesData: null,
  _connections: [],
  _contradictionRules: [],
  _initialized: false,

  async init() {
    if (this._initialized) return;
    try {
      var response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      this._cluesData = await response.json();
      GameState.restoreClueSources(this._cluesData);
      // Optional authored rules; absence must never break an investigation.
      try {
        const rulesResponse = await fetch('src/data/contradictions.json');
        if (rulesResponse.ok) {
          const rules = await rulesResponse.json();
          this._contradictionRules = Array.isArray(rules) ? rules : [];
        }
      } catch (error) {
        console.warn('[Investigation] Правила противоречий недоступны:', error);
      }
      this._initialized = true;
      console.log('[Investigation] Данные улик загружены');
    } catch (error) {
      console.error('[Investigation] Ошибка загрузки:', error);
      this._cluesData = {};
      this._initialized = true;
    }
  },

  /**
   * Проверить связь между двумя уликами
   */
  checkConnection(clueId1, clueId2) {
    if (!this._cluesData) return null;

    var clue1 = this._cluesData[clueId1];
    if (!clue1) return null;

    // Проверяем, есть ли в clue1 ссылка на clue2
    if (clue1.connections_to && clue1.connections_to.indexOf(clueId2) !== -1) {
      return {
        id: 'conn_' + clueId1 + '_' + clueId2,
        clue1: clueId1,
        clue2: clueId2,
        description: this._getConnectionDescription(clueId1, clueId2),
        found: true
      };
    }

    // Проверяем обратную связь
    var clue2 = this._cluesData[clueId2];
    if (clue2 && clue2.connections_to && clue2.connections_to.indexOf(clueId1) !== -1) {
      return {
        id: 'conn_' + clueId2 + '_' + clueId1,
        clue1: clueId1,
        clue2: clueId2,
        description: this._getConnectionDescription(clueId2, clueId1),
        found: true
      };
    }

    return null;
  },

  /**
   * Получить описание связи
   */
  _getConnectionDescription(clueId1, clueId2) {
    var descriptions = {
      'autopsy_report_01_poison_vial_info': 'Отчёт о вскрытии подтверждает, что яд — белладонна. Информация о яде указывает на портовую аптеку.',
      'autopsy_report_01_letter_k_mark': 'Буква "К" на теле судьи может быть ключом к личности убийцы.',
      'letter_k_mark_kalliopa_name': 'Буква "К" — возможно, отсылка к имени Каллиопы, убитой 20 лет назад.',
      'kalliopa_name_old_case_details': 'Дело Каллиопы связано с нынешними убийствами через всех причастных.',
      'old_case_details_judge_notes': 'Дневник судьи подтверждает: он знал, что кто-то вернулся свести счёты.',
      'judge_notes_wall_inscription': 'Надпись и дневник судьи — части одного послания о проданном правосудии.',
      'wall_inscription_broken_scales': 'Сломанные весы и надпись — символы разрушенного правосудия.',
      'broken_scales_fingerprint': 'Отпечаток на весах может принадлежать убийце.',
      'fingerprint_suspect_list_01': 'Отпечаток нужно сравнить с подозреваемыми.',
      'suspect_list_01_gabriel_identity': 'Габриэль — брат Лидии, у него самый сильный мотив.',
      'gabriel_identity_kalliopa_name': 'Габриэль был женихом Каллиопы. Его мотив — месть за любимую.',
      'body_examination_autopsy_report_01': 'Осмотр тела и отчёт о вскрытии дают полную картину смерти.',
      'body_examination_wall_inscription': 'Осмотр тела и надпись указывают на ритуальный характер убийства.',
      'old_case_details_suspect_list_01': 'Все жертвы причастны к старому делу. Круг подозреваемых сужается.',
      'poison_vial_info_pharmacy_lead': 'Яд из портовой аптеки. Нужно проверить записи продаж.'
    };

    var key1 = clueId1 + '_' + clueId2;
    var key2 = clueId2 + '_' + clueId1;

    return descriptions[key1] || descriptions[key2] || 'Эти улики связаны между собой.';
  },

  /**
   * Восстановить связи из сохранённых флагов и доступных игроку улик.
   * Имена/описания ещё не найденных материалов при этом не раскрываются.
   */
  _restoreConnections() {
    const clues = Array.isArray(GameState.currentCase?.clues) ? GameState.currentCase.clues : [];
    if (!Array.isArray(this._connections)) this._connections = [];
    const known = new Set(this._connections.map(connection => connection.id));

    for (let i = 0; i < clues.length; i++) {
      for (let j = i + 1; j < clues.length; j++) {
        const connection = this.checkConnection(clues[i].id, clues[j].id);
        if (!connection || !GameState.hasFlag('connection_' + connection.id) || known.has(connection.id)) continue;
        this._connections.push(connection);
        known.add(connection.id);
      }
    }
    return this._connections;
  },

  /**
   * Сохранить найденную связь
   */
  saveConnection(connection) {
    if (!connection || !connection.id) return false;
    this._restoreConnections();
    var exists = this._connections.some(function(c) {
      return c.id === connection.id;
    });
    if (!exists) {
      this._connections.push(connection);
      GameState.setFlag('connection_' + connection.id);
      console.log('[Investigation] Связь установлена: ' + connection.id);
      return true;
    }
    return false;
  },

  /**
   * Получить все найденные связи
   */
  getConnections() {
    return this._restoreConnections();
  },

  /**
   * Проверить прогресс расследования
   */
  getProgress() {
    var totalClues = GameState.currentCase.clues.length;
    var totalConnections = this._restoreConnections().length;
    return {
      clues: totalClues,
      connections: totalConnections,
      percentage: Math.min(100, Math.floor((totalConnections / Math.max(1, totalClues - 1)) * 100))
    };
  }
};
