import { GameState } from '../core/state.js';
import { Investigation } from '../systems/investigation.js';
import { Events } from '../core/events.js';
import { HYPOTHESIS_STATUS_LABELS, auditHypothesisEvidence, findNewEvidenceLeads, compareHypothesisRevisions } from '../systems/hypotheses.js';
import { findContradictions } from '../systems/contradictions.js';
import { getOldCaseBoardDigest } from '../systems/old-case-board-digest.js';
import { filterBoardClues } from '../systems/board-clue-filter.js';
import { filterHypotheses } from '../systems/hypothesis-filter.js';
import { getHypothesisLinkMap } from '../systems/hypothesis-link-map.js';

/**
 * Доска расследования.
 * Игрок может перетаскивать улики и соединять их.
 */
export class InvestigationBoard {
  constructor(container) {
    this.container = container;
    this.selectedClue = null;
    this.connections = [];
    this.draggedClue = null;
    this.focusedHypothesisId = null;
  }

  async render() {
    await Investigation.init();
    this.focusedHypothesisId = null;
    var clues = [...(GameState.currentCase.clues || [])];
    const savedBoardOrder = Array.isArray(GameState.currentCase.boardOrder) ? GameState.currentCase.boardOrder : [];
    const boardOrderIndex = new Map(savedBoardOrder.map((id, index) => [id, index]));
    clues.sort((a, b) => (boardOrderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (boardOrderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    const archiveDigest = getOldCaseBoardDigest(clues, GameState.flags);
    const socialTies = Array.isArray(GameState.socialGraph?.ties) ? GameState.socialGraph.ties : [];
    const socialEvents = Array.isArray(GameState.socialGraph?.events) ? GameState.socialGraph.events : [];
    const socialNames = {
      npc_lydia_winter: 'Доктор Лидия Винтер',
      npc_anna_holt: 'Анна Холт',
      npc_gabriel: 'Габриэль',
      npc_markus_holt: 'Маркус Холт',
      npc_sebastian_blackwood: 'Себастьян Блэквуд',
      npc_harold_harrison: 'Гарольд Гаррисон'
    };
    const socialTypeLabels = {
      family: 'СЕМЬЯ', colleague: 'КОЛЛЕГИ', friend: 'ДРУЗЬЯ', rival: 'СОПЕРНИКИ',
      debt: 'ДОЛГ', protective: 'ЗАЩИТА', romantic: 'ЛИЧНЫЕ ОТНОШЕНИЯ',
      unknown: 'СВЯЗЬ НЕ УСТАНОВЛЕНА'
    };
    this.connections = Investigation.getConnections();
    var self = this;

    if (clues.length === 0) {
      this.container.innerHTML = `
        <div class="board-empty noir-board-empty">
          <div class="empty-case-stamp" aria-hidden="true">?</div>
          <p class="board-title">ДОСЬЕ ПОКА ПУСТО</p>
          <p class="text-gray-400 text-sm mt-3">Любое расследование начинается с первой улики.</p>
          <p class="text-gray-500 text-xs mt-2">Отправляйтесь на место преступления и осмотрите его.</p>
          <button id="board-go-map" class="btn-noir mt-6 mx-auto">ОТКРЫТЬ КАРТУ ГОРОДА ↗</button>
        </div>
      `;
      this.container.querySelector('#board-go-map').addEventListener('click', () => Events.emit('navigate', { scene: 'city-map' }));
      return;
    }

    this.container.innerHTML = `
      <div class="investigation-board">
        <div class="board-header">
          <div class="board-title-row"><span class="board-title">ДОСЬЕ № 001 / УБИЙСТВО СУДЬИ</span><span class="board-classified">● СЕКРЕТНО</span></div>
          <p class="board-subtitle">Выберите два документа, чтобы проверить связь между ними</p>
          <p class="board-progress">Прогресс: ${Investigation.getProgress().percentage}% (${this.connections.length} связей)</p>
        </div>
        <div class="board-search" role="search" aria-label="Поиск по уликам на доске">
          <label>ПОИСК ДОКУМЕНТА <input id="board-search-query" type="search" placeholder="Название, описание, источник…" autocomplete="off" /></label>
          <label>ТИП УЛИКИ <select id="board-search-category">
            <option value="all">Все материалы</option>
            ${[...new Set(clues.map(clue => clue.category).filter(Boolean))].map(category => `<option value="${self._escapeHtml(category)}">${self._escapeHtml(category)}</option>`).join('')}
          </select></label>
          <p id="board-search-count" role="status" aria-live="polite">Показано ${clues.length} из ${clues.length}</p>
          <button type="button" id="board-search-reset" class="btn-noir">СБРОСИТЬ ПОИСК</button>
        </div>
        
        <div class="board-canvas" id="board-canvas" style="--board-content-height:${Math.max(390, Math.ceil(clues.length / 3) * 155 + 60)}px">
          <!-- SVG для линий -->
          <svg class="board-lines" id="board-lines"></svg>
          
          <!-- Улики -->
          <div class="board-clues" id="board-clues">
            ${clues.map(function(clue, index) {
              const linkedNames = self.connections
                .filter(connection => connection.clue1 === clue.id || connection.clue2 === clue.id)
                .map(connection => {
                  const linkedId = connection.clue1 === clue.id ? connection.clue2 : connection.clue1;
                  return clues.find(item => item.id === linkedId)?.name;
                })
                .filter(Boolean);
              const linkedSummary = linkedNames.length
                ? `Связано: ${linkedNames.join(', ')}`
                : 'Связей пока нет';
              return `
                <button type="button" class="board-clue-card category-${self._safeCategory(clue.category)}"
                     data-clue-id="${clue.id}" 
                     style="left: ${5 + (index % 3) * 32}%; top: ${28 + Math.floor(index / 3) * 155}px;"
                     draggable="true" aria-label="${self._escapeHtml(clue.name)}. ${self._escapeHtml(linkedSummary)}. Выберите для проверки связи с другой уликой">
                  <span class="clue-card-pin" aria-hidden="true"></span>
                  <span class="clue-card-icon">${self._getIcon(clue.category)}</span>
                  <span class="clue-card-content"><span class="clue-card-label">УЛИКА · ${String(index + 1).padStart(2, '0')}</span><span class="clue-card-name">${self._escapeHtml(clue.name)}</span><span class="clue-card-source">${self._escapeHtml(clue.source || 'Источник неизвестен')}</span><span class="clue-card-connections" aria-label="Связанные материалы">${self._escapeHtml(linkedSummary)}</span></span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="board-footer">
          <p id="board-hint" class="board-hint">Выберите две улики, чтобы проверить связь</p>
          <button id="btn-clear-selection" class="btn-noir text-xs py-2">СБРОСИТЬ ВЫБОР</button>
        </div>
        ${archiveDigest ? `<section class="board-hypotheses" aria-label="Архивное дело Каллиопы">
          <h3>АРХИВ · ДЕЛО КАЛЛИОПЫ</h3>
          <p>Получено материалов: ${archiveDigest.total}. Нажмите на документ, чтобы найти его на доске.</p>
          ${archiveDigest.groups.map(group => `<div class="hypothesis-entry">
            <h4>${self._escapeHtml(group.title)}</h4>
            <div class="reader-theories-options">${group.clueIds.map(id => {
              const clue = clues.find(item => item.id === id);
              return `<button type="button" class="reader-theories-option" data-archive-clue-id="${self._escapeHtml(id)}">${self._escapeHtml(clue.name)}</button>`;
            }).join('')}</div>
          </div>`).join('')}
          ${archiveDigest.observations.map(note => `<p class="hypothesis-evidence">✓ ${self._escapeHtml(note)}</p>`).join('')}
          <small>${self._escapeHtml(archiveDigest.warning)}</small>
        </section>` : ''}
        <section class="board-hypotheses board-social-graph" aria-label="Подтверждённые связи персонажей">
          <h3>ЛЮДИ И ИХ СВЯЗИ</h3>
          <p>Здесь отображаются только отношения, подтверждённые словами персонажей или найденными материалами. Слухи и догадки не становятся фактами.</p>
          ${socialTies.length ? socialTies.map(tie =>
            '<article class="social-tie-entry"><div class="social-tie-heading"><strong>' +
            self._escapeHtml(socialNames[tie.fromNpcId] || tie.fromNpcId) + ' — ' +
            self._escapeHtml(socialNames[tie.toNpcId] || tie.toNpcId) +
            '</strong><span>' + self._escapeHtml(socialTypeLabels[tie.type] || 'СВЯЗЬ') +
            '</span></div><p>' + self._escapeHtml(tie.basis) + '</p></article>'
          ).join('') : '<p class="social-graph-empty">Подтверждённых связей пока нет. Они будут добавляться по мере того, как вы узнаёте людей и проверяете их слова.</p>'}
        </section>
        <section class="board-hypotheses board-social-events" aria-label="Свидетельства о встречах персонажей">
          <h3>СВИДЕТЕЛЬСТВА О ВСТРЕЧАХ</h3>
          <p>Записи основаны на рассказах участников. Пока нет независимого подтверждения, это свидетельства, а не установленные факты.</p>
          ${socialEvents.length ? socialEvents.map(event =>
            '<article class="social-event-entry"><div class="social-tie-heading"><strong>' +
            self._escapeHtml(socialNames[event.fromNpcId] || event.fromNpcId) + ' — ' +
            self._escapeHtml(socialNames[event.toNpcId] || event.toNpcId) +
            '</strong><span>' + (event.certainty === 'corroborated' ? 'ПОДТВЕРЖДЕНО' :
              event.certainty === 'disputed' ? 'ОСПАРИВАЕТСЯ' : 'НЕ ПРОВЕРЕНО') +
            '</span></div><p class="social-event-time">' +
            self._escapeHtml(event.timeLabel || 'Время не установлено') +
            '</p><p>' + self._escapeHtml(event.description) + '</p><p class="social-event-source">Источник: ' +
            self._escapeHtml(event.reportedByNpcId
              ? (socialNames[event.reportedByNpcId] || event.reportedByNpcId)
              : event.sourceType === 'direct_observation' ? 'личное наблюдение Джона Риверса' : 'не указан') +
            '</p></article>'
          ).join('') : '<p class="social-graph-empty">Свидетельства о встречах пока не получены.</p>'}
        </section>
        <section class="board-hypotheses" aria-label="Архив гипотез">
          <h3>АРХИВ ГИПОТЕЗ</h3>
          <p>Запишите свою версию событий. Гипотеза — предположение детектива, а не установленный факт.</p>
          <form id="hypothesis-create-form" class="hypothesis-form">
            <label>НАЗВАНИЕ ВЕРСИИ <input name="title" maxlength="100" required placeholder="Кто мог быть причастен?" /></label>
            <label>ОБОСНОВАНИЕ <textarea name="reasoning" maxlength="2000" required rows="3" placeholder="Что заставляет вас так думать?"></textarea></label>
            <fieldset><legend>ОПОРНЫЕ УЛИКИ</legend>
              ${clues.map(clue => `<label class="hypothesis-clue"><input type="checkbox" name="clue" value="${self._escapeHtml(clue.id)}" /> ${self._escapeHtml(clue.name)}</label>`).join('')}
            </fieldset>
            <button type="submit" class="btn-noir">СОХРАНИТЬ ВЕРСИЮ</button>
          </form>
          <div class="board-search hypothesis-search" role="search" aria-label="Поиск по гипотезам">
            <label>ПОИСК ВЕРСИИ <input id="hypothesis-search-query" type="search" placeholder="Название, обоснование, улика…" autocomplete="off" /></label>
            <label>СТАТУС <select id="hypothesis-search-status">
              <option value="all">Все версии</option>
              ${Object.entries(HYPOTHESIS_STATUS_LABELS).map(([value, label]) => `<option value="${value}">${self._escapeHtml(label)}</option>`).join('')}
              <option value="review">Есть новые материалы</option>
            </select></label>
            <p id="hypothesis-search-count" role="status" aria-live="polite"></p>
            <button type="button" id="hypothesis-search-reset" class="btn-noir">СБРОСИТЬ ПОИСК</button>
          </div>
          <div id="hypothesis-list" aria-live="polite"></div>
        </section>
      </div>
    `;

    this._setupDragAndDrop();
    this._setupTouchReordering();
    this._setupClickHandlers();
    this._setupClueSearch(clues);
    this._drawConnectionLines();
    this._observeBoardSize();
    this._setupHypotheses();
    this.container.querySelectorAll('[data-archive-clue-id]').forEach(button => {
      button.addEventListener('click', () => {
        const card = Array.from(this.container.querySelectorAll('.board-clue-card'))
          .find(element => element.dataset.clueId === button.dataset.archiveClueId);
        if (!card) return;
        this.container.querySelector('#board-search-reset')?.click();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.focus({ preventScroll: true });
      });
    });
  }

  _setupHypotheses() {
    const form = this.container.querySelector('#hypothesis-create-form');
    const query = this.container.querySelector('#hypothesis-search-query');
    const status = this.container.querySelector('#hypothesis-search-status');
    query.addEventListener('input', () => this._renderHypotheses());
    status.addEventListener('change', () => this._renderHypotheses());
    this.container.querySelector('#hypothesis-search-reset').addEventListener('click', () => {
      query.value = '';
      status.value = 'all';
      this._renderHypotheses();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      try {
        GameState.addHypothesis({ title: data.get('title'), reasoning: data.get('reasoning'), clueIds: data.getAll('clue') });
        form.reset();
        this._renderHypotheses();
      } catch (error) {
        this.container.querySelector('#board-hint').textContent = error.message;
      }
    });
    this.container.querySelector('#hypothesis-list').addEventListener('change', event => {
      const select = event.target.closest('[data-hypothesis-id]');
      if (!select) return;
      GameState.reviseHypothesis(select.dataset.hypothesisId, { status: select.value });
      this._renderHypotheses();
    });
    this.container.querySelector('#hypothesis-list').addEventListener('click', event => {
      const focusButton = event.target.closest('[data-focus-hypothesis]');
      if (focusButton) {
        this._focusHypothesisClues(focusButton.dataset.focusHypothesis);
        return;
      }
      const trigger = event.target.closest('[data-review-hypothesis]');
      if (!trigger) return;
      const card = trigger.closest('.hypothesis-entry');
      const editor = card?.querySelector('.hypothesis-edit');
      if (!editor) return;
      editor.open = true;
      const firstSuggestion = editor.querySelector('input[data-new-lead="true"]');
      (firstSuggestion || editor.querySelector('textarea[name="reasoning"]'))?.focus();
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    this.container.querySelector('#hypothesis-list').addEventListener('submit', event => {
      const form = event.target.closest('.hypothesis-edit-form');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      try {
        GameState.reviseHypothesis(form.dataset.hypothesisId, {
          title: data.get('title'), reasoning: data.get('reasoning'), clueIds: data.getAll('clue')
        });
        this._renderHypotheses();
      } catch (error) {
        const message = form.querySelector('.hypothesis-edit-error');
        message.textContent = error.message;
      }
    });
    this._renderHypotheses();
  }

  _renderHypotheses() {
    const list = this.container.querySelector('#hypothesis-list');
    const hypotheses = GameState.currentCase.hypotheses || [];
    const clues = GameState.currentCase.clues || [];
    const clueNames = new Map(clues.map(clue => [clue.id, clue.name]));
    const reviewIds = new Set(hypotheses.filter(item => findNewEvidenceLeads(item, clues, Investigation._cluesData || {}).length).map(item => item.id));
    const visible = filterHypotheses(hypotheses, clues,
      this.container.querySelector('#hypothesis-search-query').value,
      this.container.querySelector('#hypothesis-search-status').value, reviewIds);
    this.container.querySelector('#hypothesis-search-count').textContent = `Найдено ${visible.length} из ${hypotheses.length} версий`;
    list.innerHTML = visible.length ? visible.map(item => {
      const audit = auditHypothesisEvidence(item, clues, Investigation._cluesData || {});
      const contradictions = findContradictions(item, clues, Investigation._contradictionRules);
      const newLeads = findNewEvidenceLeads(item, clues, Investigation._cluesData || {});
      const revision = compareHypothesisRevisions(item.history);
      return `
      <article class="hypothesis-entry">
        <h4>${this._escapeHtml(item.title)}</h4>
        <p>${this._escapeHtml(item.reasoning)}</p>
        <p class="hypothesis-meta">УЛИКИ: ${(item.clueIds || []).length} · ИЗМЕНЕНИЙ: ${Math.max(0, (item.history || []).length - 1)}</p>
        <p class="hypothesis-evidence">${(item.clueIds || []).map(id => `<span>◇ ${this._escapeHtml(clueNames.get(id) || 'Материал недоступен')}</span>`).join('') || 'Улики пока не прикреплены'}</p>
        <button type="button" class="reader-theories-option" data-focus-hypothesis="${this._escapeHtml(item.id)}" aria-pressed="${this.focusedHypothesisId === item.id}" ${(item.clueIds || []).some(id => clueNames.has(id)) ? '' : 'disabled'}>${this.focusedHypothesisId === item.id ? 'УБРАТЬ ПОДСВЕТКУ' : 'ПОКАЗАТЬ УЛИКИ НА ДОСКЕ ↗'}</button>
        ${newLeads.length ? `<aside class="hypothesis-audit" aria-label="Новые материалы для пересмотра">
          <strong>НОВЫЕ МАТЕРИАЛЫ · ${newLeads.length}</strong>
          <p>После последнего изменения этой версии появились связанные документы. Проверьте их и при необходимости пересмотрите вывод.</p>
          <p class="hypothesis-evidence">${newLeads.map(lead => `<span>◇ ${this._escapeHtml(lead.name)}</span>`).join('')}</p>
          <small>Это возможные направления проверки, а не подтверждение гипотезы. Материалы не добавляются автоматически.</small>
          <button type="button" class="reader-theories-option" data-review-hypothesis="${this._escapeHtml(item.id)}">ПЕРЕСМОТРЕТЬ ВЕРСИЮ ↗</button>
        </aside>` : ''}
        ${item.importReviewRequired ? `<aside class="hypothesis-audit" role="status" aria-label="Импортированная версия требует проверки">
          <strong>ИМПОРТИРОВАННЫЙ СТАТУС НЕ ПОДТВЕРЖДЁН</strong>
          <p>Файл сохранения не доказывает независимую проверку. Версия переведена в статус «Вероятна». Проверьте материалы и сохраните пересмотр, чтобы снять это уведомление.</p>
        </aside>` : ''}
        <aside class="hypothesis-audit" aria-label="Проверка опорных улик">
          <strong>АНАЛИЗ ДОКАЗАТЕЛЬСТВ</strong>
          <p>${audit.attached === 0 ? 'Пока нет опорных улик: версия требует проверки.'
            : audit.attached === 1 ? 'Приложена одна улика. Для проверки вывода полезны независимые подтверждения.'
            : audit.needsReview ? `Связанные группы улик: ${audit.groups.length}. Между некоторыми материалами нет установленной связи — проверьте промежуточные факты.`
            : `Все ${audit.attached} прикреплённые улики входят в одну цепочку известных связей.`}</p>
          ${audit.missing ? `<p>Недоступных материалов: ${audit.missing}. Перепроверьте состав гипотезы.</p>` : ''}
          ${audit.sharedSources.length ? `<p>⚠ Совпадающее происхождение: ${audit.sharedSources.length} ${audit.sharedSources.length === 1 ? 'группа' : 'групп(ы)'} документов. Это ещё не независимые подтверждения.</p>
          ${audit.sharedSources.map(group => `<p class="hypothesis-evidence">${group.clueIds.map(id => this._escapeHtml(clueNames.get(id) || 'Материал')).join(' · ')} — источник: ${this._escapeHtml(group.label)}</p>`).join('')}` : ''}
          ${audit.unknownSources ? `<p>Не указан источник у ${audit.unknownSources} ${audit.unknownSources === 1 ? 'улики' : 'улик(и)'} — независимость оценить нельзя.</p>` : ''}
          <small>Связь на доске не доказывает достоверность или независимость источников и не подтверждает истинность версии.</small>
        </aside>
        ${contradictions.length ? `<aside class="hypothesis-contradictions" aria-label="Обнаруженные противоречия">
          <strong>ТРЕБУЮТ ПРОВЕРКИ · ${contradictions.length}</strong>
          ${contradictions.map(rule => `<p>${this._escapeHtml(rule.summary)}</p>
            ${rule.followUp ? `<small>${this._escapeHtml(rule.followUp)}</small>` : ''}`).join('')}
        </aside>` : ''}
        <label>ОЦЕНКА ДЕТЕКТИВА
          <select data-hypothesis-id="${this._escapeHtml(item.id)}" aria-label="Статус гипотезы ${this._escapeHtml(item.title)}">
            ${Object.entries(HYPOTHESIS_STATUS_LABELS).filter(([value]) => value !== 'confirmed' || item.status === 'confirmed').map(([value, label]) => `<option value="${value}" ${item.status === value ? 'selected' : ''} ${value === 'confirmed' ? 'disabled' : ''}>${value === 'confirmed' ? 'Подтверждена (ранее сохранено)' : label}</option>`).join('')}
          </select>
        </label>
        <details class="hypothesis-edit"><summary>ИЗМЕНИТЬ ВЕРСИЮ</summary>
          <form class="hypothesis-form hypothesis-edit-form" data-hypothesis-id="${this._escapeHtml(item.id)}">
            <label>НАЗВАНИЕ <input name="title" maxlength="100" required value="${this._escapeHtml(item.title)}" /></label>
            <label>ОБОСНОВАНИЕ <textarea name="reasoning" maxlength="2000" required rows="3">${this._escapeHtml(item.reasoning)}</textarea></label>
            <fieldset><legend>ОПОРНЫЕ УЛИКИ</legend>${clues.map(clue => `<label class="hypothesis-clue"><input type="checkbox" name="clue" value="${this._escapeHtml(clue.id)}" ${(item.clueIds || []).includes(clue.id) ? 'checked' : ''} ${newLeads.some(lead => lead.id === clue.id) ? 'data-new-lead="true"' : ''} /> ${this._escapeHtml(clue.name)}${newLeads.some(lead => lead.id === clue.id) ? ' · НОВАЯ' : ''}</label>`).join('')}</fieldset>
            <p class="hypothesis-edit-error" role="alert"></p>
            <button type="submit" class="btn-noir">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
          </form>
        </details>
        <details class="hypothesis-history"><summary>ИСТОРИЯ ВЕРСИИ (${(item.history || []).length})</summary>
          ${revision ? `<div class="hypothesis-audit" aria-label="Изменения последней редакции">
            <strong>ПОСЛЕДНЕЕ ИЗМЕНЕНИЕ</strong>
            ${revision.added.length ? `<p>Добавлены улики: ${revision.added.map(id => this._escapeHtml(clueNames.get(id) || 'Ранее доступный материал')).join(', ')}.</p>` : ''}
            ${revision.removed.length ? `<p>Убраны улики: ${revision.removed.map(id => this._escapeHtml(clueNames.get(id) || 'Ранее доступный материал')).join(', ')}.</p>` : ''}
            ${revision.titleChanged ? '<p>Название версии изменено.</p>' : ''}
            ${revision.reasoningChanged ? '<p>Обоснование пересмотрено.</p>' : ''}
            ${revision.statusChanged ? `<p>Оценка: ${this._escapeHtml(HYPOTHESIS_STATUS_LABELS[revision.oldStatus] || 'Не проверена')} → ${this._escapeHtml(HYPOTHESIS_STATUS_LABELS[revision.newStatus] || 'Не проверена')}.</p>` : ''}
            ${!revision.added.length && !revision.removed.length && !revision.titleChanged && !revision.reasoningChanged && !revision.statusChanged ? '<p>Содержательные изменения не обнаружены.</p>' : ''}
          </div>` : ''}
          <ol>${(item.history || []).map(entry => `<li>
            <time>${this._escapeHtml(new Date(entry.at).toLocaleString('ru-RU'))}</time> · ${entry.type === 'created' ? 'Создана' : 'Пересмотрена'} · ${this._escapeHtml(HYPOTHESIS_STATUS_LABELS[entry.status] || 'Не проверена')}
            ${entry.title ? `<span>${this._escapeHtml(entry.title)}</span>` : ''}
            ${entry.reasoning ? `<p>${this._escapeHtml(entry.reasoning)}</p>` : ''}
            <small>Улик: ${(entry.clueIds || []).length}</small>
          </li>`).join('')}</ol>
        </details>
      </article>`;
    }).join('') : `<p class="hypothesis-empty">${hypotheses.length ? 'По заданным условиям версий нет. Измените поиск или сбросьте фильтр.' : 'Пока нет версий. Начните с наблюдения.'}</p>`;
  }

  _setupClickHandlers() {
    var self = this;
    var cards = this.container.querySelectorAll('.board-clue-card');

    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var clueId = this.getAttribute('data-clue-id');
        self._onClueClick(clueId, this);
      });
    });

    document.getElementById('btn-clear-selection').addEventListener('click', function() {
      self._clearSelection();
      self._clearHypothesisFocus();
    });
  }

  _focusHypothesisClues(hypothesisId) {
    if (this.focusedHypothesisId === hypothesisId) {
      this._clearHypothesisFocus();
      this._renderHypotheses();
      return;
    }
    const hypothesis = (GameState.currentCase.hypotheses || []).find(item => item.id === hypothesisId);
    if (!hypothesis) return;
    const map = getHypothesisLinkMap(hypothesis.clueIds, GameState.currentCase.clues || [], this.connections);
    const ids = new Set(map.ids);
    const cards = [...this.container.querySelectorAll('.board-clue-card')];
    const matching = cards.filter(card => ids.has(card.dataset.clueId));
    if (!matching.length) return;
    this._clearSelection();
    // Reveal every attached card, even if the document search previously hid it.
    this.container.querySelector('#board-search-reset')?.click();
    this.focusedHypothesisId = hypothesisId;
    cards.forEach(card => {
      card.classList.toggle('board-clue-hypothesis', ids.has(card.dataset.clueId));
      card.classList.toggle('board-clue-hypothesis-muted', !ids.has(card.dataset.clueId));
    });
    this._drawConnectionLines();
    const hint = this.container.querySelector('#board-hint');
    hint.textContent = `Версия «${hypothesis.title}»: ${matching.length} улик, ${map.links.length} открытых связей, ${map.isolated.length} без открытых связей; отдельных цепочек: ${map.groups.length}.${map.missing ? ` Недоступных документов: ${map.missing}.` : ''} Связь не доказывает версию. «Сбросить выбор» вернёт доску.`;
    hint.className = 'board-hint board-hint-active';
    this._renderHypotheses();
    matching[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    matching[0].focus({ preventScroll: true });
  }

  _clearHypothesisFocus() {
    this.focusedHypothesisId = null;
    this.container.querySelectorAll('.board-clue-card').forEach(card => {
      card.classList.remove('board-clue-hypothesis', 'board-clue-hypothesis-muted');
    });
    this._drawConnectionLines();
    this._renderHypotheses();
  }

  _setupClueSearch(clues) {
    const query = this.container.querySelector('#board-search-query');
    const category = this.container.querySelector('#board-search-category');
    const count = this.container.querySelector('#board-search-count');
    const reset = this.container.querySelector('#board-search-reset');
    const apply = () => {
      const matching = new Set(filterBoardClues(clues, query.value, category.value));
      this._clearSelection();
      this.container.querySelectorAll('.board-clue-card').forEach(card => {
        const excluded = !matching.has(card.dataset.clueId);
        card.classList.toggle('board-clue-filtered', excluded);
        card.disabled = excluded;
        card.draggable = !excluded;
      });
      count.textContent = `Найдено ${matching.size} из ${clues.length} материалов`;
    };
    query.addEventListener('input', apply);
    category.addEventListener('change', apply);
    reset.addEventListener('click', () => {
      query.value = '';
      category.value = 'all';
      apply();
    });
  }

  _onClueClick(clueId, element) {
    var hint = document.getElementById('board-hint');

    if (!this.selectedClue) {
      // Первый выбор
      this.selectedClue = { id: clueId, element: element };
      element.classList.add('board-clue-selected');
      hint.textContent = 'Теперь выберите вторую улику для соединения';
      hint.className = 'board-hint board-hint-active';
    } else if (this.selectedClue.id === clueId) {
      // Снятие выбора
      this._clearSelection();
      return;
    } else {
      // Второй выбор — проверяем связь
      var connection = Investigation.checkConnection(this.selectedClue.id, clueId);

      if (connection) {
        const alreadyFound = this.connections.some(c => c.id === connection.id);
        Investigation.saveConnection(connection);
        // this.connections references Investigation's collection; saveConnection updates it.
        this._drawConnectionLines();
        hint.textContent = (alreadyFound ? 'Эта связь уже обнаружена: ' : 'Связь найдена: ') + connection.description;
        hint.className = 'board-hint board-hint-success';
        
        // Анимация успеха
        this._flashCards(this.selectedClue.element, element);
      } else {
        hint.textContent = '❌ Эти улики не связаны напрямую. Попробуйте другую комбинацию.';
        hint.className = 'board-hint board-hint-fail';
      }

      // Сбрасываем выбор
      this.selectedClue.element.classList.remove('board-clue-selected');
      this.selectedClue = null;

      // Обновляем прогресс
      var progressEl = this.container.querySelector('.board-progress');
      if (progressEl) {
        progressEl.textContent = 'Прогресс: ' + Investigation.getProgress().percentage + '% (' + this.connections.length + ' связей)';
      }
    }
  }

  _flashCards(card1, card2) {
    card1.classList.add('board-clue-connected');
    card2.classList.add('board-clue-connected');
    setTimeout(function() {
      card1.classList.remove('board-clue-connected');
      card2.classList.remove('board-clue-connected');
    }, 1000);
  }

  _clearSelection() {
    if (this.selectedClue) {
      this.selectedClue.element.classList.remove('board-clue-selected');
      this.selectedClue = null;
    }
    var hint = document.getElementById('board-hint');
    if (hint) {
      hint.textContent = 'Выберите две улики, чтобы проверить связь';
      hint.className = 'board-hint';
    }
  }

  _setupDragAndDrop() {
    var self = this;
    var cards = this.container.querySelectorAll('.board-clue-card');

    cards.forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        self.draggedClue = this;
        this.style.opacity = '0.5';
      });

      card.addEventListener('dragend', function(e) {
        this.style.opacity = '1';
        self.draggedClue = null;
      });

      card.addEventListener('dragover', function(e) {
        e.preventDefault();
      });

      card.addEventListener('drop', function(e) {
        e.preventDefault();
        if (self.draggedClue) {
          // Поменять местами
          var tempLeft = self.draggedClue.style.left;
          var tempTop = self.draggedClue.style.top;
          self.draggedClue.style.left = this.style.left;
          self.draggedClue.style.top = this.style.top;
          this.style.left = tempLeft;
          this.style.top = tempTop;
          self._drawConnectionLines();
        }
      });
    });
  }

  _setupTouchReordering() {
    const canvas = this.container.querySelector('.board-clues');
    if (!canvas) return;
    let active = null;

    canvas.querySelectorAll('.board-clue-card').forEach(card => {
      card.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' || event.button !== 0) return;
        active = {
          card,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false
        };
        card.setPointerCapture?.(event.pointerId);
      });

      card.addEventListener('pointermove', event => {
        if (!active || active.card !== card || active.pointerId !== event.pointerId) return;
        const dx = event.clientX - active.startX;
        const dy = event.clientY - active.startY;
        if (Math.abs(dx) + Math.abs(dy) > 8) active.moved = true;
        if (!active.moved) return;
        card.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
        card.style.zIndex = '20';
      });

      const finish = event => {
        if (!active || active.card !== card || active.pointerId !== event.pointerId) return;
        const drag = active;
        active = null;
        card.style.transform = '';
        card.style.zIndex = '';
        if (!drag.moved) return;

        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.board-clue-card');
        if (!target || target === card || !canvas.contains(target)) return;

        const ids = [...canvas.querySelectorAll('.board-clue-card')].map(item => item.dataset.clueId);
        const from = ids.indexOf(card.dataset.clueId);
        const to = ids.indexOf(target.dataset.clueId);
        if (from < 0 || to < 0) return;
        [ids[from], ids[to]] = [ids[to], ids[from]];

        const previousOrder = GameState.currentCase.boardOrder;
        GameState.currentCase.boardOrder = ids;
        if (GameState.save() === false) {
          if (previousOrder === undefined) delete GameState.currentCase.boardOrder;
          else GameState.currentCase.boardOrder = previousOrder;
          this.container.querySelector('#board-hint').textContent = 'Не удалось сохранить расположение. Изменения отменены.';
          this.container.querySelector('#board-hint').className = 'board-hint board-hint-fail';
          return;
        }
        this.render();
      };

      card.addEventListener('pointerup', finish);
      card.addEventListener('pointercancel', event => {
        if (active?.card === card && active.pointerId === event.pointerId) {
          active = null;
          card.style.transform = '';
          card.style.zIndex = '';
        }
      });
      card.addEventListener('click', event => {
        if (card.dataset.touchDragged === 'true') {
          delete card.dataset.touchDragged;
          event.stopImmediatePropagation();
        }
      }, true);
    });
  }

  _observeBoardSize() {
    const canvas = this.container.querySelector('.board-canvas');
    if (typeof ResizeObserver === 'undefined' || !canvas) return;
    const observer = new ResizeObserver(() => {
      if (!canvas.isConnected) return observer.disconnect();
      this._drawConnectionLines();
    });
    observer.observe(canvas);
  }

  _escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  _safeCategory(value) {
    return String(value || 'unknown').replace(/[^a-z0-9-]/gi, '');
  }

  _drawConnectionLines() {
    var svg = this.container.querySelector('#board-lines');
    if (!svg) return;

    var lines = '';
    var self = this;
    const focused = this.focusedHypothesisId && (GameState.currentCase.hypotheses || []).find(item => item.id === this.focusedHypothesisId);
    const focusedIds = new Set(focused?.clueIds || []);

    this.connections.forEach(function(conn) {
      var card1 = self.container.querySelector('[data-clue-id="' + conn.clue1 + '"]');
      var card2 = self.container.querySelector('[data-clue-id="' + conn.clue2 + '"]');

      if (card1 && card2) {
        var rect1 = card1.getBoundingClientRect();
        var rect2 = card2.getBoundingClientRect();
        var boardRect = self.container.querySelector('.board-canvas').getBoundingClientRect();

        var x1 = rect1.left + rect1.width / 2 - boardRect.left;
        var y1 = rect1.top + rect1.height / 2 - boardRect.top;
        var x2 = rect2.left + rect2.width / 2 - boardRect.left;
        var y2 = rect2.top + rect2.height / 2 - boardRect.top;

        const type = !focused ? '' : focusedIds.has(conn.clue1) && focusedIds.has(conn.clue2) ? ' connection-line-hypothesis' : ' connection-line-muted';
        lines += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="connection-line' + type + '" />';
      }
    });

    svg.innerHTML = lines;
  }

  _getIcon(category) {
    var icons = {
      document: '▤',
      observation: '◎',
      object: '◆',
      information: '✎',
      evidence: '⌕',
      important: '★'
    };
    return icons[category] || '•';
  }
}
