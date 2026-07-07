/**
 * Мини-игра: Снятие отпечатков.
 * Нужно аккуратно провести кисточкой, не смазав отпечаток.
 */
export default class FingerprintGame {
  constructor(container, config) {
    this.container = container.querySelector('#minigame-container');
    this.config = config || {};
    this.quality = 100;
    this.isBrushing = false;
    this.brushPath = [];
    this.isActive = false;
  }

  start() {
    var self = this;
    this.isActive = true;

    return new Promise(function(resolve, reject) {
      self._resolve = resolve;
      self._reject = reject;
      self._render();
    });
  }

  _render() {
    var self = this;

    this.container.innerHTML = `
      <div class="minigame-content">
        <div class="minigame-header">
          <p class="minigame-title">🔬 СНЯТИЕ ОТПЕЧАТКОВ</p>
          <p class="minigame-subtitle">Аккуратно проведите кисточкой по поверхности. Не нажимайте слишком сильно!</p>
        </div>

        <div class="fingerprint-body">
          <div class="fingerprint-surface" id="fingerprint-surface">
            <div class="fingerprint-print"></div>
            <div class="fingerprint-brush" id="fingerprint-brush">🖌️</div>
            <canvas id="fingerprint-canvas" class="fingerprint-canvas"></canvas>
          </div>

          <div class="fingerprint-quality">
            <p class="cipher-label">КАЧЕСТВО ОТПЕЧАТКА:</p>
            <div class="quality-bar">
              <div class="quality-fill" id="quality-fill" style="width: ${this.quality}%"></div>
            </div>
            <p class="quality-text" id="quality-text">${this.quality}%</p>
          </div>
        </div>

        <div class="minigame-footer">
          <p class="minigame-hint" id="fingerprint-hint">Медленно проведите кисточкой по отпечатку</p>
          <button class="btn-noir text-xs py-2" id="btn-done-fingerprint">ГОТОВО</button>
        </div>
      </div>
    `;

    var surface = document.getElementById('fingerprint-surface');
    var brush = document.getElementById('fingerprint-brush');

    // Движение кисточки
    surface.addEventListener('mousemove', function(e) {
      if (!self.isBrushing || !self.isActive) return;
      self._moveBrush(e.clientX, e.clientY);
    });

    surface.addEventListener('mousedown', function(e) {
      if (!self.isActive) return;
      self.isBrushing = true;
      self._moveBrush(e.clientX, e.clientY);
    });

    surface.addEventListener('mouseup', function() {
      self.isBrushing = false;
    });

    surface.addEventListener('mouseleave', function() {
      self.isBrushing = false;
    });

    // Touch
    surface.addEventListener('touchmove', function(e) {
      if (!self.isBrushing || !self.isActive) return;
      e.preventDefault();
      var touch = e.touches[0];
      self._moveBrush(touch.clientX, touch.clientY);
    });

    surface.addEventListener('touchstart', function(e) {
      if (!self.isActive) return;
      self.isBrushing = true;
      var touch = e.touches[0];
      self._moveBrush(touch.clientX, touch.clientY);
    });

    surface.addEventListener('touchend', function() {
      self.isBrushing = false;
    });

    document.getElementById('btn-done-fingerprint').addEventListener('click', function() {
      self._finish();
    });
  }

  _moveBrush(clientX, clientY) {
    var surface = document.getElementById('fingerprint-surface');
    if (!surface) return;

    var rect = surface.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;

    // Проверяем, в пределах ли поверхности
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    var brush = document.getElementById('fingerprint-brush');
    if (brush) {
      brush.style.left = x + 'px';
      brush.style.top = y + 'px';
    }

    // Симулируем снятие отпечатка
    this.brushPath.push({ x: x, y: y });

    // Проверяем скорость движения (если слишком быстро — качество падает)
    if (this.brushPath.length > 2) {
      var last = this.brushPath[this.brushPath.length - 1];
      var prev = this.brushPath[this.brushPath.length - 2];
      var distance = Math.sqrt(Math.pow(last.x - prev.x, 2) + Math.pow(last.y - prev.y, 2));

      if (distance > 30) {
        // Слишком быстро!
        this.quality = Math.max(0, this.quality - 3);
        this._updateQuality();
      } else if (distance > 5) {
        // Нормально — проявляем отпечаток
        this._revealFingerprint(x, y);
      }
    }
  }

  _revealFingerprint(x, y) {
    var canvas = document.getElementById('fingerprint-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;

    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  _updateQuality() {
    var fill = document.getElementById('quality-fill');
    var text = document.getElementById('quality-text');
    if (fill) fill.style.width = this.quality + '%';
    if (text) text.textContent = this.quality + '%';

    // Меняем цвет
    if (this.quality < 30) {
      fill.style.background = '#f87171';
      document.getElementById('fingerprint-hint').textContent = '⚠️ Слишком быстро! Замедлитесь!';
    } else if (this.quality < 60) {
      fill.style.background = '#facc15';
    } else {
      fill.style.background = '#4ade80';
    }
  }

  _finish() {
    this.isActive = false;

    if (this.quality >= 70) {
      document.getElementById('fingerprint-hint').textContent = '✅ Отличный отпечаток!';
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(function() {
        this._resolve({ success: true, quality: this.quality });
      }.bind(this), 1000);
    } else if (this.quality >= 40) {
      document.getElementById('fingerprint-hint').textContent = '👍 Приемлемо. Отпечаток можно использовать.';
      setTimeout(function() {
        this._resolve({ success: true, quality: this.quality });
      }.bind(this), 1000);
    } else {
      document.getElementById('fingerprint-hint').textContent = '💀 Отпечаток смазан. Попробуйте ещё раз.';
      setTimeout(function() {
        this._reject('Отпечаток смазан');
      }.bind(this), 1000);
    }
  }
}