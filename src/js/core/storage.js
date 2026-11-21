export var Storage = {
  PREFIX: 'deadCalm_',
  BACKUP_SUFFIX: '__backup',
  PENDING_SUFFIX: '__pending',

  _parse(serialized) {
    if (typeof serialized !== 'string' || serialized.length === 0) return null;
    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  },

  save(key, data) {
    var storageKey = this.PREFIX + key;
    var backupKey = storageKey + this.BACKUP_SUFFIX;
    var pendingKey = storageKey + this.PENDING_SUFFIX;

    try {
      var serialized = JSON.stringify(data);
      if (typeof serialized !== 'string') {
        throw new Error('Данные сохранения не удалось сериализовать');
      }

      // Stage a complete payload first. If the tab closes during the next
      // operations, load() can still recover this committed JSON payload.
      localStorage.setItem(pendingKey, serialized);

      var previous = localStorage.getItem(storageKey);
      if (previous !== null && this._parse(previous) !== null) {
        try {
          localStorage.setItem(backupKey, previous);
        } catch (backupError) {
          // A full storage quota must not prevent trying to write the new
          // primary save; the old primary remains intact until then.
          console.warn('[Storage] Не удалось обновить резервную копию:', backupError);
        }
      }

      localStorage.setItem(storageKey, serialized);
      localStorage.removeItem(pendingKey);
      return true;
    } catch (error) {
      console.error('[Storage] Ошибка сохранения "' + key + '":', error);
      return false;
    }
  },

  load(key) {
    var storageKey = this.PREFIX + key;
    try {
      var primary = this._parse(localStorage.getItem(storageKey));
      if (primary !== null) return primary;

      var backup = this._parse(localStorage.getItem(storageKey + this.BACKUP_SUFFIX));
      if (backup !== null) {
        console.warn('[Storage] Основное сохранение повреждено; восстановлена резервная копия "' + key + '"');
        return backup;
      }

      var pending = this._parse(localStorage.getItem(storageKey + this.PENDING_SUFFIX));
      if (pending !== null) {
        console.warn('[Storage] Основное сохранение отсутствует или повреждено; восстановлена staged-копия "' + key + '"');
        return pending;
      }

      return null;
    } catch (error) {
      console.error('[Storage] Ошибка загрузки "' + key + '":', error);
      return null;
    }
  },

  exists(key) {
    var storageKey = this.PREFIX + key;
    try {
      return this._parse(localStorage.getItem(storageKey)) !== null ||
        this._parse(localStorage.getItem(storageKey + this.BACKUP_SUFFIX)) !== null ||
        this._parse(localStorage.getItem(storageKey + this.PENDING_SUFFIX)) !== null;
    } catch (error) {
      console.error('[Storage] Ошибка проверки сохранения "' + key + '":', error);
      return false;
    }
  },

  remove(key) {
    var storageKey = this.PREFIX + key;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey + this.BACKUP_SUFFIX);
    localStorage.removeItem(storageKey + this.PENDING_SUFFIX);
  },

  /**
   * Очистить ВСЕ данные игры, включая резервные и staged-копии.
   */
  clearAll() {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(function(key) {
      localStorage.removeItem(key);
    });
    console.log('[Storage] Удалено записей игры: ' + keysToRemove.length);
  }
};
