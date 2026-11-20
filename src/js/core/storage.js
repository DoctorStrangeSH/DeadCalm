export var Storage = {
  PREFIX: 'deadCalm_',

  save(key, data) {
    try {
      var serialized = JSON.stringify(data);
      localStorage.setItem(this.PREFIX + key, serialized);
    } catch (error) {
      console.error('[Storage] Ошибка сохранения "' + key + '":', error);
    }
  },

  inspect(key) {
    try {
      var serialized = localStorage.getItem(this.PREFIX + key);
      if (serialized === null) return { status: 'missing', data: null };
      var data = JSON.parse(serialized);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { status: 'corrupt', data: null, error: new Error('Сохранение должно содержать объект состояния') };
      }
      return { status: 'valid', data };
    } catch (error) {
      console.error('[Storage] Ошибка загрузки "' + key + '":', error);
      return { status: error instanceof SyntaxError ? 'corrupt' : 'unavailable', data: null, error };
    }
  },

  load(key) {
    var result = this.inspect(key);
    return result.status === 'valid' ? result.data : null;
  },

  exists(key) {
    return localStorage.getItem(this.PREFIX + key) !== null;
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /**
   * Очистить ВСЕ данные игры
   */
  clearAll() {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) {
      localStorage.removeItem(key);
    });
    console.log('[Storage] Удалено сохранений: ' + keysToRemove.length);
  }
};