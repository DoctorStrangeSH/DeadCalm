import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/js/core/state.js';
import { Notebook } from '../src/js/systems/notebook.js';

function withNotebook(run) {
  const previous = {
    notebook: GameState.notebook,
    currentCase: GameState.currentCase,
    save: GameState.save
  };
  let saves = 0;
  try {
    GameState.notebook = [];
    GameState.currentCase = {
      id: 'case_001',
      clues: [{
        id: 'clue_archive',
        name: 'Архивная выписка',
        description: 'Запись о выдаче документа',
        source: 'Реестр городского архива',
        location: 'Архив суда',
        foundAt: '2026-11-21T10:00:00.000Z',
        day: 2
      }]
    };
    GameState.save = () => { saves++; return true; };
    run(() => saves);
  } finally {
    GameState.notebook = previous.notebook;
    GameState.currentCase = previous.currentCase;
    GameState.save = previous.save;
  }
}

test('deleting a journal note never deletes or mutates the underlying evidence', () => {
  withNotebook(() => {
    Notebook.addNote({
      title: 'Сверить архив',
      text: 'Нужно проверить запись.',
      source: 'Личный вывод',
      day: 2
    });
    assert.equal(Notebook.removeNote('Сверить архив'), true);
    assert.equal(GameState.notebook.length, 0);
    assert.equal(GameState.currentCase.clues.length, 1);
    assert.equal(GameState.currentCase.clues[0].id, 'clue_archive');
    assert.equal(GameState.currentCase.clues[0].source, 'Реестр городского архива');
  });
});

test('notebook export includes source and timestamp for traceability', () => {
  withNotebook(() => {
    GameState.notebook = [{
      title: 'Сверить архив',
      text: 'Нужно проверить запись.',
      category: 'расследование',
      source: 'Личный вывод',
      timestamp: '2026-11-21T10:00:00.000Z',
      day: 2
    }];
    const exported = Notebook.exportToText();
    assert.match(exported, /Сверить архив/);
    assert.match(exported, /Нужно проверить запись\./);
    assert.match(exported, /Источник: Личный вывод/);
    assert.match(exported, /Записано: 2026-11-21T10:00:00\.000Z/);
  });
});

test('export tolerates older or partial journal records', () => {
  withNotebook(() => {
    GameState.notebook = [{ title: 'Старая запись', text: null, day: 1 }];
    const exported = Notebook.exportToText();
    assert.match(exported, /Старая запись/);
    assert.match(exported, /\[ОБЩЕЕ\]/);
  });
});


test('notes with duplicate titles are pinned and deleted by stable id', () => {
  withNotebook(() => {
    GameState.notebook = [
      { id: 'note-first', title: 'Одинаковое название', text: 'Первая запись', pinned: false },
      { id: 'note-second', title: 'Одинаковое название', text: 'Вторая запись', pinned: false }
    ];
    assert.equal(Notebook.togglePin('note-second'), true);
    assert.equal(GameState.notebook[0].pinned, false);
    assert.equal(GameState.notebook[1].pinned, true);
    assert.equal(Notebook.removeNote('note-second'), true);
    assert.equal(GameState.notebook.length, 1);
    assert.equal(GameState.notebook[0].id, 'note-first');
  });
});

test('new journal notes receive a stable identifier', () => {
  withNotebook(() => {
    assert.equal(Notebook.addNote({ title: 'Запись с идентификатором', text: 'Текст' }), true);
    assert.match(GameState.notebook[0].id, /^note-\d+-[a-z0-9]+$/);
  });
});


test('distinct notes may share a title while exact duplicate imports are ignored', () => {
  withNotebook(() => {
    assert.equal(Notebook.addNote({ title: 'Показания у двери', text: 'Свидетель слышал шаги.', source: 'Сосед' }), true);
    assert.equal(Notebook.addNote({ title: 'Показания у двери', text: 'В коридоре погас свет.', source: 'Консьерж' }), true);
    assert.equal(GameState.notebook.length, 2);
    assert.notEqual(GameState.notebook[0].id, GameState.notebook[1].id);
    assert.equal(Notebook.addNote({ title: 'Показания у двери', text: 'Свидетель слышал шаги.', source: 'Сосед' }), false);
    assert.equal(GameState.notebook.length, 2);
  });
});
