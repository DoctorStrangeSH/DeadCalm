/**
 * Система Quick Time Events.
 * Показывает кнопки/свайпы, которые нужно быстро нажать.
 */
export default class QTESystem {
  constructor(container, config) {
    this.container = container;
    this.config = config || {};
    this.sequence = this.config.sequence || this._generateSequence();
    this.timeLimit = this.config.timeLimit || 1500; // мс на одно действие
    this.currentIndex = 0;
    this.successCount = 0;
    this.failCount = 0;
    this.maxFails = this.config.maxFails || 3;
    this.isActive = false;
    this.timerId = null;
  }

  _generateSequence() {
    var actions = this.config.actions || ['up', 'down', 'left', 'right', 'tap'];
    var length = this.config.length || 6;
    var seq = [];
    for (var i = 0; i < length; i++) {
      seq.push(actions[Math.floor(Math.random() * actions.length)]);
    }
    return seq;
  }

  start() {
    var self = this;
    this.isActive = true;
    this.currentIndex = 0;
    this.successCount = 0;
    this.failCount = 0;

    return new Promise(function(resolve, reject) {
      self._resolve = resolve;
      self._reject = reject;
      self._render();
      self._showNextAction();
    });
  }

  _render() {
    this.container.innerHTML = `
      <div class="minigame-content qte-content">
        <div class="minigame-header">
          <p class="minigame-title">⚡ БЫСТРАЯ РЕАКЦИЯ</p>
          <p class="minigame-subtitle">Выполняйте действия быстро!</p>
        </div>

        <div class="qte-body">
          <div class="qte-progress-bar">
            <div class="qte-progress-fill" id="qte-progress-fill" style="width: 100%"></div>
          </div>

          <div class="qte-action-area" id="qte-action-area">
            <div class="qte-action-display" id="qte-action-display">
              <span class="qte-action-icon" id="qte-icon">👆</span>
              <span class="qte-action-text" id="qte-text">НАЖМИТЕ</span>
            </div>
          </div>

          <div class="qte-score">
            <span class="qte-success">✅ ${this.successCount}</span>
            <span class="qte-divider">|</span>
            <span class="qte-fail">❌ ${this.failCount}/${this.maxFails}</span>
          </div>
        </div>

        <div class="qte-controls" id="qte-controls">
          <button class="qte-btn qte-btn-up" data-action="up">⬆️</button>
          <div class="qte-controls-row">
            <button class="qte-btn qte-btn-left" data-action="left">⬅️</button>
            <button class="qte-btn qte-btn-tap" data-action="tap">👆</button>
            <button class="qte-btn qte-btn-right" data-action="right">➡️</button>
          </div>
          <button class="qte-btn qte-btn-down" data-action="down">⬇️</button>
        </div>
      </div>
    `;

    this._setupControls();
  }

  _setupControls() {
    var self = this;

    // Кнопки на экране
    this.container.querySelectorAll('.qte-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!self.isActive) return;
        var action = this.getAttribute('data-action');
        self._handleAction(action);
      });
    });

    // Клавиатура (для десктопа)
    document.addEventListener('keydown', this._keyHandler = function(e) {
      if (!self.isActive) return;
      var keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        ' ': 'tap',
        'Enter': 'tap'
      };
      var action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        self._handleAction(action);
      }
    });

    // Свайпы на мобилке
    var touchStartX = 0;
    var touchStartY = 0;
    var actionArea = document.getElementById('qte-action-area');

    if (actionArea) {
      actionArea.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      });

      actionArea.addEventListener('touchend', function(e) {
        if (!self.isActive) return;
        var diffX = e.changedTouches[0].clientX - touchStartX;
        var diffY = e.changedTouches[0].clientY - touchStartY;
        var minSwipe = 30;

        if (Math.abs(diffX) < minSwipe && Math.abs(diffY) < minSwipe) {
          self._handleAction('tap');
        } else if (Math.abs(diffX) > Math.abs(diffY)) {
          self._handleAction(diffX > 0 ? 'right' : 'left');
        } else {
          self._handleAction(diffY > 0 ? 'down' : 'up');
        }
      });
    }
  }

  _showNextAction() {
    if (!this.isActive) return;
    if (this.currentIndex >= this.sequence.length) {
      this._win();
      return;
    }

    var action = this.sequence[this.currentIndex];
    var display = this._getActionDisplay(action);

    document.getElementById('qte-icon').textContent = display.icon;
    document.getElementById('qte-text').textContent = display.text;

    // Подсветка нужной кнопки
    this.container.querySelectorAll('.qte-btn').forEach(function(btn) {
      btn.classList.remove('qte-btn-active');
    });
    var activeBtn = this.container.querySelector('[data-action="' + action + '"]');
    if (activeBtn) activeBtn.classList.add('qte-btn-active');

    // Таймер
    var self = this;
    var progressFill = document.getElementById('qte-progress-fill');
    var startTime = Date.now();

    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var percent = Math.max(0, 100 - (elapsed / self.timeLimit) * 100);
      if (progressFill) progressFill.style.width = percent + '%';

      if (percent < 30) {
        progressFill.style.background = '#f87171';
      } else if (percent < 60) {
        progressFill.style.background = '#facc15';
      } else {
        progressFill.style.background = '#4ade80';
      }

      if (elapsed >= self.timeLimit) {
        clearInterval(self.timerId);
        self._handleFail();
      }
    }, 50);
  }

  _handleAction(action) {
    if (!this.isActive) return;

    var expected = this.sequence[this.currentIndex];

    if (action === expected) {
      // Успех!
      this.successCount++;
      this.currentIndex++;
      clearInterval(this.timerId);

      // Обновляем счёт
      this.container.querySelector('.qte-success').textContent = '✅ ' + this.successCount;

      // Эффект успеха
      var actionArea = document.getElementById('qte-action-area');
      if (actionArea) {
        actionArea.classList.add('qte-success-flash');
        setTimeout(function() { actionArea.classList.remove('qte-success-flash'); }, 300);
      }

      if (navigator.vibrate) navigator.vibrate(20);

      if (this.currentIndex >= this.sequence.length) {
        this._win();
      } else {
        this._showNextAction();
      }
    } else {
      // Ошибка
      this._handleFail();
    }
  }

  _handleFail() {
    this.failCount++;
    clearInterval(this.timerId);

    this.container.querySelector('.qte-fail').textContent = '❌ ' + this.failCount + '/' + this.maxFails;

    // Эффект ошибки
    var actionArea = document.getElementById('qte-action-area');
    if (actionArea) {
      actionArea.classList.add('qte-fail-flash');
      setTimeout(function() { actionArea.classList.remove('qte-fail-flash'); }, 300);
    }

    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);

    if (this.failCount >= this.maxFails) {
      this._lose();
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.sequence.length) {
        this._win();
      } else {
        this._showNextAction();
      }
    }
  }

  _getActionDisplay(action) {
    var displays = {
      'up': { icon: '⬆️', text: 'СВАЙП ВВЕРХ' },
      'down': { icon: '⬇️', text: 'СВАЙП ВНИЗ' },
      'left': { icon: '⬅️', text: 'СВАЙП ВЛЕВО' },
      'right': { icon: '➡️', text: 'СВАЙП ВПРАВО' },
      'tap': { icon: '👆', text: 'НАЖМИТЕ' }
    };
    return displays[action] || { icon: '❓', text: 'ДЕЙСТВИЕ' };
  }

  _win() {
    this.isActive = false;
    clearInterval(this.timerId);
    document.removeEventListener('keydown', this._keyHandler);

    document.getElementById('qte-action-display').innerHTML = '<span class="qte-result-success">✅ УСПЕШНО!</span>';

    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);

    setTimeout(function() {
      this._resolve({ success: true, score: this.successCount, total: this.sequence.length });
    }.bind(this), 1500);
  }

  _lose() {
    this.isActive = false;
    clearInterval(this.timerId);
    document.removeEventListener('keydown', this._keyHandler);

    document.getElementById('qte-action-display').innerHTML = '<span class="qte-result-fail">❌ ПРОВАЛ</span>';

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    setTimeout(function() {
      this._reject('Слишком много ошибок');
    }.bind(this), 1500);
  }
}