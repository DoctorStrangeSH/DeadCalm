/**
 * Мини-игра: Взлом замка.
 * Нужно нажимать на штифты в правильном порядке.
 */
export default class LockpickGame {
  constructor(container, config) {
    this.container = container.querySelector('#minigame-container');
    this.config = config || {};
    this.pins = this.config.pins || 5;
    this.correctOrder = this._generateOrder();
    this.playerOrder = [];
    this.attempts = this.config.attempts || 3;
    this.isActive = false;
  }

  _generateOrder() {
    var order = [];
    for (var i = 0; i < this.pins; i++) {
      order.push(i);
    }
    // Перемешиваем
    for (var j = order.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var temp = order[j];
      order[j] = order[k];
      order[k] = temp;
    }
    return order;
  }

  start() {
    var self = this;
    this.isActive = true;

    return new Promise(function(resolve, reject) {
      self._render();
      self._resolve = resolve;
      self._reject = reject;
    });
  }

  _render() {
    var self = this;

    this.container.innerHTML = `
      <div class="minigame-content">
        <div class="minigame-header">
          <p class="minigame-title">🔐 ВЗЛОМ ЗАМКА</p>
          <p class="minigame-subtitle">Нажимайте на штифты в правильном порядке. Попыток: ${this.attempts}</p>
        </div>

        <div class="lockpick-body">
          <div class="lockpick-lock">
            <div class="lock-body">
              <div class="lock-shackle"></div>
              <div class="lock-keyhole"></div>
            </div>
          </div>

          <div class="lockpick-pins" id="lockpick-pins">
            ${Array.from({ length: this.pins }, function(_, i) {
              return '<div class="lockpick-pin" data-pin="' + i + '">' + (i + 1) + '</div>';
            }).join('')}
          </div>

          <div class="lockpick-progress" id="lockpick-progress">
            ${Array.from({ length: this.pins }, function() {
              return '<span class="progress-dot"></span>';
            }).join('')}
          </div>
        </div>

        <div class="minigame-footer">
          <p class="minigame-hint" id="lockpick-hint">Нажмите на первый штифт</p>
          <button class="btn-noir text-xs py-2" id="btn-reset-lockpick">СБРОСИТЬ</button>
        </div>
      </div>
    `;

    // Обработчики
    this.container.querySelectorAll('.lockpick-pin').forEach(function(pin) {
      pin.addEventListener('click', function() {
        if (!self.isActive) return;
        var pinIndex = parseInt(this.getAttribute('data-pin'));
        self._onPinClick(pinIndex);
      });
    });

    document.getElementById('btn-reset-lockpick').addEventListener('click', function() {
      self._reset();
    });
  }

  _onPinClick(pinIndex) {
    var expectedPin = this.correctOrder[this.playerOrder.length];

    if (pinIndex === expectedPin) {
      // Правильно
      this.playerOrder.push(pinIndex);
      this._updateProgress();

      var pinEl = this.container.querySelector('[data-pin="' + pinIndex + '"]');
      if (pinEl) {
        pinEl.classList.add('pin-correct');
        pinEl.style.pointerEvents = 'none';
      }

      // Виброотклик
      if (navigator.vibrate) navigator.vibrate(30);

      if (this.playerOrder.length === this.pins) {
        // Все штифты выбиты — ПОБЕДА!
        this._win();
      } else {
        document.getElementById('lockpick-hint').textContent = 'Штифт ' + (pinIndex + 1) + ' — верно! Следующий...';
      }
    } else {
      // Ошибка
      this.attempts--;
      document.getElementById('lockpick-hint').textContent = '❌ Неверный штифт! Осталось попыток: ' + this.attempts;

      // Трясём замок
      var lockBody = this.container.querySelector('.lock-body');
      if (lockBody) {
        lockBody.classList.add('shake');
        setTimeout(function() { lockBody.classList.remove('shake'); }, 500);
      }

      // Вибрация ошибки
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      if (this.attempts <= 0) {
        this._lose();
      } else {
        this._resetPins();
      }
    }
  }

  _updateProgress() {
    var dots = this.container.querySelectorAll('.progress-dot');
    for (var i = 0; i < this.playerOrder.length; i++) {
      if (dots[i]) dots[i].classList.add('filled');
    }
  }

  _resetPins() {
    this.playerOrder = [];
    var self = this;
    this.container.querySelectorAll('.lockpick-pin').forEach(function(pin) {
      pin.classList.remove('pin-correct');
      pin.style.pointerEvents = 'auto';
    });
  }

  _reset() {
    this.playerOrder = [];
    this.attempts = this.config.attempts || 3;
    this.correctOrder = this._generateOrder();
    document.getElementById('lockpick-hint').textContent = 'Нажмите на первый штифт (попыток: ' + this.attempts + ')';
    this._resetPins();
    var dots = this.container.querySelectorAll('.progress-dot');
    dots.forEach(function(d) { d.classList.remove('filled'); });
  }

  _win() {
    this.isActive = false;
    var lockBody = this.container.querySelector('.lock-body');
    if (lockBody) lockBody.classList.add('unlocked');

    document.getElementById('lockpick-hint').textContent = '✅ Замок открыт!';

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    setTimeout(function() {
      this._resolve({ success: true, message: 'Замок взломан' });
    }.bind(this), 1200);
  }

  _lose() {
    this.isActive = false;
    document.getElementById('lockpick-hint').textContent = '💀 Замок заклинило. Попытки исчерпаны.';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    setTimeout(function() {
      this._reject('Попытки исчерпаны');
    }.bind(this), 1500);
  }
}