import QTESystem from './qte-system.js';

/**
 * Мини-игра: Погоня.
 * Игрок преследует подозреваемого, уклоняясь от препятствий.
 * Состоит из нескольких фаз: бег + QTE.
 */
export default class ChaseGame {
  constructor(container, config) {
    this.container = container.querySelector('#minigame-container');
    this.config = config || {};
    this.phase = 0;
    this.totalPhases = this.config.phases || 3;
    this.lane = 1; // 0 = лево, 1 = центр, 2 = право
    this.score = 0;
    this.isActive = false;
    this.obstacles = [];
    this.frameId = null;
    this.speed = this.config.speed || 2;
    this.distance = 0;
    this.targetDistance = this.config.targetDistance || 100;
  }

  start() {
    var self = this;
    this.isActive = true;

    return new Promise(function(resolve, reject) {
      self._resolve = resolve;
      self._reject = reject;
      self._render();
      self._gameLoop();
    });
  }

  _render() {
    this.container.innerHTML = `
      <div class="minigame-content chase-content">
        <div class="minigame-header">
          <p class="minigame-title">🏃 ПОГОНЯ</p>
          <p class="minigame-subtitle">Уклоняйтесь от препятствий! Дистанция: <span id="chase-distance">0</span>м</p>
        </div>

        <div class="chase-body">
          <div class="chase-road" id="chase-road">
            <div class="chase-lane-marks">
              <div class="chase-lane-mark"></div>
              <div class="chase-lane-mark"></div>
            </div>
            <div class="chase-player" id="chase-player">🏃</div>
            <div class="chase-target" id="chase-target">👤</div>
          </div>
        </div>

        <div class="chase-controls">
          <button class="chase-btn" id="chase-left">⬅️</button>
          <button class="chase-btn" id="chase-right">➡️</button>
        </div>

        <div class="minigame-footer">
          <p class="minigame-hint" id="chase-hint">Уклоняйтесь от препятствий и догоните цель!</p>
        </div>
      </div>
    `;

    this._setupControls();
    this._spawnObstacles();
  }

  _setupControls() {
    var self = this;

    // Кнопки
    document.getElementById('chase-left').addEventListener('click', function() {
      self._moveLane(-1);
    });
    document.getElementById('chase-right').addEventListener('click', function() {
      self._moveLane(1);
    });

    // Клавиатура
    document.addEventListener('keydown', this._keyHandler = function(e) {
      if (!self.isActive) return;
      if (e.key === 'ArrowLeft') self._moveLane(-1);
      if (e.key === 'ArrowRight') self._moveLane(1);
    });

    // Свайпы
    var road = document.getElementById('chase-road');
    var touchStartX = 0;

    if (road) {
      road.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
      });

      road.addEventListener('touchend', function(e) {
        if (!self.isActive) return;
        var diffX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diffX) > 30) {
          self._moveLane(diffX > 0 ? 1 : -1);
        }
      });
    }
  }

  _moveLane(direction) {
    this.lane = Math.max(0, Math.min(2, this.lane + direction));
    var player = document.getElementById('chase-player');
    if (player) {
      var positions = ['15%', '50%', '85%'];
      player.style.left = positions[this.lane];
    }
  }

  _spawnObstacles() {
    var self = this;
    var obstacleTypes = [
      { icon: '🗑️', lane: 0 },
      { icon: '🚧', lane: 1 },
      { icon: '💧', lane: 2 },
      { icon: '📦', lane: 0 },
      { icon: '🕳️', lane: 2 }
    ];

    setInterval(function() {
      if (!self.isActive) return;
      var type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      self._createObstacle(type.icon, type.lane);
    }, 1500);
  }

  _createObstacle(icon, lane) {
    var road = document.getElementById('chase-road');
    if (!road) return;

    var obstacle = document.createElement('div');
    obstacle.className = 'chase-obstacle';
    obstacle.textContent = icon;
    obstacle.style.left = ['15%', '50%', '85%'][lane];
    obstacle.style.top = '-40px';
    road.appendChild(obstacle);

    this.obstacles.push({ element: obstacle, lane: lane, top: -40 });
  }

  _gameLoop() {
    var self = this;

    this.frameId = requestAnimationFrame(function loop() {
      if (!self.isActive) {
        cancelAnimationFrame(self.frameId);
        return;
      }

      // Движение препятствий
      self.obstacles.forEach(function(obs, index) {
        obs.top += self.speed;
        obs.element.style.top = obs.top + 'px';

        // Проверка столкновения
        if (obs.top > 180 && obs.top < 220 && obs.lane === self.lane) {
          self._hitObstacle(index);
        }

        // Удаление ушедших
        if (obs.top > 280) {
          obs.element.remove();
          self.obstacles.splice(index, 1);
        }
      });

      // Прогресс погони
      self.distance += 0.1;
      document.getElementById('chase-distance').textContent = Math.floor(self.distance);

      // Приближаем цель
      var target = document.getElementById('chase-target');
      if (target && self.distance > self.targetDistance * 0.7) {
        target.style.opacity = Math.min(1, (self.distance - self.targetDistance * 0.7) / (self.targetDistance * 0.3));
      }

      if (self.distance >= self.targetDistance) {
        // Догнали! Запускаем QTE для захвата
        self._startQTEPhase();
      } else {
        self.frameId = requestAnimationFrame(loop);
      }
    });
  }

  _hitObstacle(index) {
    this.distance -= 5;
    document.getElementById('chase-hint').textContent = '💥 Столкновение! Вы теряете дистанцию.';
    document.getElementById('chase-distance').textContent = Math.floor(this.distance);

    var obstacle = this.obstacles[index];
    if (obstacle && obstacle.element) {
      obstacle.element.classList.add('obstacle-hit');
      setTimeout(function() {
        if (obstacle.element) obstacle.element.remove();
      }, 500);
    }
    this.obstacles.splice(index, 1);

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }

  _startQTEPhase() {
    this.isActive = false;
    cancelAnimationFrame(this.frameId);
    document.removeEventListener('keydown', this._keyHandler);

    document.getElementById('chase-hint').textContent = '🎯 Цель близко! Приготовьтесь к захвату!';

    var self = this;
    setTimeout(function() {
      var qte = new QTESystem(self.container, {
        sequence: ['tap', 'left', 'right', 'tap', 'up', 'tap'],
        timeLimit: 1200,
        maxFails: 2
      });

      qte.start()
        .then(function(result) {
          self._win(result);
        })
        .catch(function(error) {
          self._lose(error);
        });
    }, 1500);
  }

  _win(qteResult) {
    document.getElementById('chase-hint').textContent = '✅ Подозреваемый пойман!';
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    setTimeout(function() {
      this._resolve({
        success: true,
        distance: this.distance,
        qteScore: qteResult.score
      });
    }.bind(this), 2000);
  }

  _lose(error) {
    document.getElementById('chase-hint').textContent = '💀 Подозреваемый скрылся...';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    setTimeout(function() {
      this._reject(error || 'Подозреваемый сбежал');
    }.bind(this), 2000);
  }
}