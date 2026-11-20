import { renderStoryLocation } from '../components/story-location.js';

export function render(container) {
  renderStoryLocation(container, {
    title: 'ОСОБНЯК БЛЭКВУДА',
    subtitle: 'Северный холм · частная резиденция',
    description: 'В доме нет ни одной случайной вещи. Себастьян Блэквуд принимает вас в кабинете с видом на порт. Он не отрицает, что знал Каллиопу, но каждое его слово звучит как заранее подготовленный ответ.',
    npcId: 'npc_sebastian_blackwood'
  });
}
