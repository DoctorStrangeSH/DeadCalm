import { renderStoryLocation } from '../components/story-location.js';

export function render(container) {
  renderStoryLocation(container, {
    title: 'ЦЕРКОВЬ СВЯТОЙ МАРИИ',
    subtitle: 'Блэкфорд · церковный архив',
    description: 'В боковом приделе пахнет воском и сыростью. Отец Томас разбирает старые книги пожертвований. Среди них он обнаружил письмо прежнего настоятеля Мэтьюса, которое двадцать лет никто не решался передать полиции.',
    npcId: 'npc_father_thomas'
  });
}
