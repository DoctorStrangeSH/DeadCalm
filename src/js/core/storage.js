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

  load(key) {
    try {
      var serialized = localStorage.getItem(this.PREFIX + key);
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      console.error('[Storage] Ошибка загрузки "' + key + '":', error);
      return null;
    }
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