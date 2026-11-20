import { renderStoryLocation } from '../components/story-location.js';

export function render(container) {
  renderStoryLocation(container, {
    title: 'ДОМ ХОЛТОВ',
    subtitle: 'Жилой квартал · дом Маркуса Холта',
    description: 'В доме всё оставлено так, словно хозяин вышел ненадолго. Анна Холт не верит полиции и не собирается отдавать вещи отца первому встречному. На столе лежит закрытая деревянная коробка.',
    npcId: 'npc_anna_holt',
    background: 'holt-office.webp'
  });
}
