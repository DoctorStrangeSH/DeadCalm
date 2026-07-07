/**
 * Вспомогательные утилиты
 */

/** Задержка (для анимаций, таймеров) */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Показать уведомление на экране */
export function showNotification(message, type = 'info') {
  const area = document.getElementById('notification-area');
  if (!area) return;

  const notification = document.createElement('div');
  notification.className = 'notification fade-in';
  notification.textContent = message;
  area.appendChild(notification);

  // Автоматически скрыть через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/** Форматирование даты */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** Генерация уникального ID */
export function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Эффект печатной машинки */
export async function typewriterEffect(element, text, speed = 40) {
  element.textContent = '';
  for (let i = 0; i < text.length; i++) {
    element.textContent += text[i];
    await delay(speed);
  }
}

/** Проверка на мобильное устройство */
export function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

/** Вибрация (если поддерживается) */
export function vibrate(pattern = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}