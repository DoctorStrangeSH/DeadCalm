import { renderStoryLocation } from '../components/story-location.js';
import { Events } from '../core/events.js';

export function render(container) {
  renderStoryLocation(container, {
    title: 'СТАРЫЙ ПОРТ',
    subtitle: 'Блэкфорд · пятый день расследования',
    description: 'Ветер тянет с воды запах соли и мазута. Старые причалы почти пусты. Именно здесь двадцать лет назад погибла Каллиопа; здесь же Маркус оставил последнее сообщение. Улики должны говорить раньше, чем люди.',
    background: 'blackford-harbor.webp',
    action: {
      label: 'НАСТРОИТЬ ПОРТОВУЮ ЧАСТОТУ ↗',
      description: 'Проверить временное окно по фрагменту радиосвязи.'
    }
  });
  container.querySelector('#btn-story-action')?.addEventListener('click', () => {
    Events.emit('navigate', { scene: 'radio-tuning' });
  });
}
