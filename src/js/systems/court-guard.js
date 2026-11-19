import { hasDiscoveredContradiction } from './contradictions.js';

export function canChallengeGuard(currentCase, rules) {
  return hasDiscoveredContradiction('guard_denies_spare_key',
    currentCase?.hypotheses, currentCase?.clues || [], rules);
}

export function resolveGuardChallenge(tone) {
  if (tone === 'patient') {
    return {
      tone,
      trustDelta: 5,
      text: 'Вы кладёте опись рядом с показаниями. Белл долго молчит: «Ладно. Я не знал про дубликат. После восьми я ушёл на обход западной лестницы. Посмотрите мой маршрутный лист — там время. Я не могу поклясться, что в коридоре никого не было». Он сам приносит заверенную копию.'
    };
  }
  if (tone === 'pressure') {
    return {
      tone,
      trustDelta: -15,
      text: 'Вы требуете объяснить, почему охранник скрыл ключ. Белл сжимает челюсти: «Я ничего не скрывал. Допрашивайте меня при начальнике». Он отказывается продолжать беседу. Дежурный по письменному запросу выдаёт копию маршрутного листа: личная неприязнь Белла не лишает следствие доступа к служебному документу.'
    };
  }
  return null;
}
