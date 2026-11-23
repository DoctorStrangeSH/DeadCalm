import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dialogues = readJson('../src/data/dialogues.json');

test('Marta never learns or reveals the identity of her anonymous source prematurely', () => {
  const marta = dialogues.npc_marta_hayes;
  assert.match(marta.first_meeting.text, /Кто её оставил — не знаю/);
  assert.match(marta.topics.about_source.responses[0].answer, /Никогда не называл имени/);
  assert.doesNotMatch(marta.first_meeting.text, /Маркус/);
  assert.doesNotMatch(marta.topics.about_source.responses[0].answer, /Маркус/);
});

test('Father Thomas attributes the 1967 statement to Matthews and does not claim eyewitness knowledge', () => {
  const thomas = dialogues.npc_father_thomas;
  const letter = thomas.topics.about_letter.responses[0].answer;
  assert.match(letter, /Мэтьюс пишет/);
  assert.match(letter, /не называет себя очевидцем убийства/);
  assert.match(letter, /не рассказ о том, что он видел/);
  assert.doesNotMatch(letter, /я видел убийство/i);
  assert.match(thomas.topics.about_letter.responses[1].answer, /Я не знаю, кто положил его туда/);
});

test('Lydia distinguishes her brother’s wrongful accusation from complete knowledge of the old case', () => {
  const lydia = dialogues.npc_lydia_winter;
  const answer = lydia.topics.about_herself.responses[0].answer;
  assert.match(answer, /Он не убивал её/);
  assert.match(answer, /боялась, что ему снова не поверят/);
  assert.doesNotMatch(answer, /Маркус/);
  assert.match(lydia.lydia_reveals_secret.text, /Я не знаю всех деталей старого дела/);
});


test('Anna does not claim to know Markus’s location or the full reason he contacted John', () => {
  const anna = dialogues.npc_anna_holt;
  assert.match(anna.first_meeting.text, /где он, я отвечу.*не знаю/);
  assert.match(anna.topics.about_markus.responses[1].answer, /Я не знаю, почему это было важно именно сейчас/);
  assert.doesNotMatch(anna.first_meeting.text, /он находится|он в порту|он в особняке/i);
});

test('Ray preserves the unknown identity of the court switchboard caller', () => {
  const ray = dialogues.npc_ray_morgan;
  assert.match(ray.topics.about_case.responses.find(item => item.id === 'inspect_incoming_calls').answer,
    /Кто именно позвонил — по ней не установить/);
  assert.match(ray.topics.about_case.responses.find(item => item.id === 'review_court_register_with_ray').answer,
    /Ни имени, ни подписи/);
});

test('Sebastian does not confess to either murder during ordinary dialogue', () => {
  const serialize = JSON.stringify(dialogues.npc_sebastian_blackwood);
  assert.doesNotMatch(serialize, /я убил Каллиопу|я убил Гаррисона|я отравил Гаррисона/i);
  assert.match(dialogues.npc_sebastian_blackwood.sebastian_challenged_result.text,
    /Он не признаёт и не подтверждает обстоятельства убийства/);
});
