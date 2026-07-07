/**
 * Мини-игра: Расшифровка кода.
 * Нужно сопоставить символы с буквами, чтобы расшифровать сообщение.
 */
export default class CipherGame {
  constructor(container, config) {
    this.container = container.querySelector('#minigame-container');
    this.config = config || {};
    this.message = this.config.message || 'КЛЮЧ В СЕЙФЕ';
    this.key = this.config.key || this._generateKey();
    this.encodedMessage = this._encode();
    this.playerMapping = {};
    this.attempts = this.config.attempts || 3;
    this.isActive = false;
  }

  _generateKey() {
    var alphabet = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    var shuffled = alphabet.split('').sort(function() { return Math.random() - 0.5; });
    var key = {};
    for (var i = 0; i < alphabet.length; i++) {
      key[alphabet[i]] = shuffled[i];
    }
    return key;
  }

  _encode() {
    var self = this;
    return this.message.split('').map(function(ch) {
      return self.key[ch] || ch;
    }).join('');
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
          <p class="minigame-title">🔐 РАСШИФРОВКА</p>
          <p class="minigame-subtitle">Сопоставьте символы с буквами, чтобы прочитать сообщение</p>
        </div>

        <div class="cipher-body">
          <div class="cipher-message">
            <p class="cipher-label">ЗАШИФРОВАННОЕ СООБЩЕНИЕ:</p>
            <div class="cipher-text" id="cipher-encoded">
              ${this.encodedMessage.split('').map(function(ch, i) {
                return '<span class="cipher-char" data-index="' + i + '" data-symbol="' + ch + '">' + (self.playerMapping[ch] || ch) + '</span>';
              }).join('')}
            </div>
          </div>

          <div class="cipher-decoded" id="cipher-decoded">
            <p class="cipher-label">РАСШИФРОВКА:</p>
            <div class="cipher-text" id="cipher-result">
              ${this.message.split('').map(function() {
                return '<span class="cipher-char">_</span>';
              }).join('')}
            </div>
          </div>

          <div class="cipher-input">
            <p class="cipher-label">СОПОСТАВЬТЕ:</p>
            <div class="cipher-mapping" id="cipher-mapping">
              <span class="cipher-symbol-display" id="cipher-current-symbol">?</span>
              <span class="cipher-arrow">→</span>
              <input type="text" id="cipher-input-letter" class="cipher-input-field" maxlength="1" placeholder="Буква">
              <button id="btn-cipher-submit" class="btn-noir text-xs py-1 px-3">OK</button>
            </div>
          </div>
        </div>

        <div class="minigame-footer">
          <p class="minigame-hint" id="cipher-hint">Выберите символ из сообщения, затем введите букву</p>
          <p class="minigame-attempts">Осталось попыток: ${this.attempts}</p>
        </div>
      </div>
    `;

    var currentSymbol = null;

    // Выбор символа
    this.container.querySelectorAll('.cipher-char').forEach(function(charEl) {
      charEl.addEventListener('click', function() {
        var symbol = this.getAttribute('data-symbol');
        if (self.playerMapping[symbol]) return; // Уже расшифрован
        currentSymbol = symbol;
        document.getElementById('cipher-current-symbol').textContent = symbol;
        document.getElementById('cipher-hint').textContent = 'Введите букву для символа "' + symbol + '"';
      });
    });

    // Ввод буквы
    document.getElementById('btn-cipher-submit').addEventListener('click', function() {
      if (!currentSymbol) {
        document.getElementById('cipher-hint').textContent = 'Сначала выберите символ из сообщения';
        return;
      }

      var letter = document.getElementById('cipher-input-letter').value.toUpperCase();
      if (!letter || letter.length !== 1) {
        document.getElementById('cipher-hint').textContent = 'Введите одну букву';
        return;
      }

      self._tryMapping(currentSymbol, letter);
      document.getElementById('cipher-input-letter').value = '';
      currentSymbol = null;
      document.getElementById('cipher-current-symbol').textContent = '?';
    });
  }

  _tryMapping(symbol, letter) {
    // Проверяем, правильная ли буква
    var correctLetter = '';
    for (var l in this.key) {
      if (this.key[l] === symbol) {
        correctLetter = l;
        break;
      }
    }

    if (letter === correctLetter) {
      // Правильно!
      this.playerMapping[symbol] = letter;
      this._updateDisplay();

      if (navigator.vibrate) navigator.vibrate(30);

      // Проверяем, всё ли расшифровано
      var allDecoded = this.encodedMessage.split('').every(function(ch) {
        return ch === ' ' || this.playerMapping[ch];
      }.bind(this));

      if (allDecoded) {
        this._win();
      } else {
        document.getElementById('cipher-hint').textContent = '✅ Верно! Выберите следующий символ.';
      }
    } else {
      // Ошибка
      this.attempts--;
      document.getElementById('cipher-hint').textContent = '❌ Неверно! Осталось попыток: ' + this.attempts;
      document.querySelector('.minigame-attempts').textContent = 'Осталось попыток: ' + this.attempts;

      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      if (this.attempts <= 0) {
        this._lose();
      }
    }
  }

  _updateDisplay() {
    var self = this;
    // Обновляем зашифрованное сообщение
    this.container.querySelectorAll('.cipher-char').forEach(function(charEl) {
      var symbol = charEl.getAttribute('data-symbol');
      if (self.playerMapping[symbol]) {
        charEl.textContent = self.playerMapping[symbol];
        charEl.classList.add('decoded');
      }
    });

    // Обновляем результат
    var resultChars = this.container.querySelectorAll('#cipher-result .cipher-char');
    var decodedArray = this.encodedMessage.split('').map(function(ch) {
      return self.playerMapping[ch] || '_';
    });

    resultChars.forEach(function(el, i) {
      if (decodedArray[i] !== '_') {
        el.textContent = decodedArray[i];
        el.classList.add('decoded');
      }
    });
  }

  _win() {
    this.isActive = false;
    document.getElementById('cipher-hint').textContent = '✅ Сообщение расшифровано: «' + this.message + '»';
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    setTimeout(function() {
      this._resolve({ success: true, message: this.message });
    }.bind(this), 2000);
  }

  _lose() {
    this.isActive = false;
    document.getElementById('cipher-hint').textContent = '💀 Не удалось расшифровать. Правильный ответ: «' + this.message + '»';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    setTimeout(function() {
      this._reject('Попытки исчерпаны');
    }.bind(this), 2000);
  }
}