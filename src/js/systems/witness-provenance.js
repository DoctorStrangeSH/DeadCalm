import { hasDiscoveredContradiction } from './contradictions.js';

export function canTraceSecretary(currentCase, rules) {
  return hasDiscoveredContradiction('secretary_vs_late_pass',
    currentCase?.hypotheses, currentCase?.clues || [], rules);
}

export function canConfrontOrlov(currentCase, rules) {
  return hasDiscoveredContradiction('orlov_departure_vs_badge',
    currentCase?.hypotheses, currentCase?.clues || [], rules);
}

export function canConfrontKlimov(currentCase, rules) {
  return hasDiscoveredContradiction('klimov_key_denial_vs_issue',
    currentCase?.hypotheses, currentCase?.clues || [], rules);
}

export function resolveKlimovConfrontation(tone) {
  if (tone === 'patient') return {
    trustDelta: 5,
    text: 'Климов изучает запись: «Это мой табельный номер, но почерк не мой. В тот вечер у выдачи был сменщик. Я оставил инструмент на столе дежурного, не оформляя универсальный ключ». Он советует запросить записку сменного кладовщика. Кто получил ключ, Климов не знает.'
  };
  if (tone === 'pressure') return {
    trustDelta: -15,
    text: 'Климов резко отодвигает книгу: «Номер мой, а подпись чужая. Без адвоката больше ничего не скажу». Следователь запрашивает объяснение сменного кладовщика официально — отказ Климова не закрывает доступ к учётным документам.'
  };
  return null;
}

export function resolveOrlovConfrontation(tone) {
  if (tone === 'patient') return {
    trustDelta: 5,
    text: 'Орлов теребит манжету: «Да, карточку после ухода я оставил в канцелярии для проверки считывателя. Это нарушение инструкции — потому и не сказал сразу. В журнале передачи должна быть расписка. Я не знаю, кто затем ей воспользовался». Он сам указывает на ведомость.'
  };
  if (tone === 'pressure') return {
    trustDelta: -15,
    text: 'При виде распечатки Орлов замолкает: «Это моя карточка, но не доказывает, что я был там». Он требует адвоката и прекращает разговор. По служебному запросу вам всё же выдают ведомость передачи карточек из канцелярии.'
  };
  return null;
}

// A repeated account isn't independent corroboration when both reports share one source.
export function assessIndependentAccounts(accounts) {
  const sources = new Set();
  const duplicates = [];
  for (const account of accounts) {
    if (!account?.origin || !account?.id) continue;
    if (sources.has(account.origin)) duplicates.push(account.id);
    sources.add(account.origin);
  }
  return { independentSources: sources.size, dependentAccounts: duplicates };
}
