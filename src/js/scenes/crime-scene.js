import { Events } from '../core/events.js';
import { GameState } from '../core/state.js';

export function render(container, data) {
  var location = data?.location || { name: 'Место преступления', description: 'Зал суда' };

  container.innerHTML = `
    <div class="scene court-crime-scene">
      <div class="scene-header mb-4">
        <div>
          <h2 class="text-gold text-lg md:text-2xl tracking-widest">${location.name}</h2>
          <p class="text-gray-500 text-xs md:text-sm tracking-wider mt-1">День 1, раннее утро</p>
        </div>
        <button id="btn-leave" class="text-gray-400 hover:text-gold transition text-sm tracking-widest">
          ← УЙТИ
        </button>
      </div>

      <div class="divider mb-4 md:mb-6"></div>

      <div class="court-art">
        <img src="src/assets/backgrounds/blackford-courtroom.webp" alt="Пустой зал суда после убийства: контур тела на полу, разбитые весы, судейский стол и следы на стене" loading="eager" />
        <div class="court-hotspots" aria-label="Зоны осмотра места преступления">
          <button type="button" class="court-hotspot court-hotspot-body" data-trigger="btn-zone-body" aria-label="Осмотреть контур тела"><span>01</span><em>Контур тела</em></button>
          <button type="button" class="court-hotspot court-hotspot-wall" data-trigger="btn-zone-wall" aria-label="Изучить надпись на стене"><span>02</span><em>Надпись</em></button>
          <button type="button" class="court-hotspot court-hotspot-scales" data-trigger="btn-zone-scales" aria-label="Осмотреть сломанные весы"><span>03</span><em>Весы</em></button>
          <button type="button" class="court-hotspot court-hotspot-desk" data-trigger="btn-zone-desk" aria-label="Осмотреть стол судьи"><span>04</span><em>Стол судьи</em></button>
        </div>
      </div>
      <p class="court-scan-hint">ОСМОТР МЕСТА ПРЕСТУПЛЕНИЯ · Выберите отметку на изображении или улику из списка</p>

      <div class="court-narrative mb-6">
        <p class="text-gray-400 text-sm italic">
          Вы переступаете через жёлтую ленту. В зале суда тихо — так тихо, что слышно, как где-то капает вода.
          Воздух густой, спёртый, с металлическим привкусом. Так пахнут места, где произошло что-то непоправимое.
        </p>
        <p class="text-gray-400 text-sm italic mt-2">
          На полу — меловой контур тела. Руки раскинуты, ноги неестественно вывернуты. Судья умер не сразу — мел зафиксировал его последнюю позу, позу человека, который пытался ползти.
          На стене, над судейским креслом, алеет надпись: <span class="text-blood">«СЛЕПОЕ ПРАВОСУДИЕ»</span>. Буквы неровные, выведены пальцем. Кровь уже потемнела, но послание всё ещё кричит.
        </p>
      </div>

      <div class="court-zone-list grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <button id="btn-zone-body" class="card text-left court-zone-card">
          <p class="card-title">01 / ТЕЛО СУДЬИ</p>
          <p class="card-subtitle">Очерченный мелом силуэт на полу</p>
        </button>

        <button id="btn-zone-wall" class="card text-left court-zone-card">
          <p class="card-title">02 / НАДПИСЬ НА СТЕНЕ</p>
          <p class="card-subtitle">«СЛЕПОЕ ПРАВОСУДИЕ» — послание убийцы</p>
        </button>

        <button id="btn-zone-scales" class="card text-left court-zone-card">
          <p class="card-title">03 / СЛОМАННЫЕ ВЕСЫ</p>
          <p class="card-subtitle">Весы Фемиды разбиты</p>
        </button>

        <button id="btn-zone-desk" class="card text-left court-zone-card">
          <p class="card-title">04 / СТОЛ СУДЬИ</p>
          <p class="card-subtitle">Ящики, бумаги, личные вещи</p>
        </button>
      </div>

      <div id="court-records" class="mb-6" ${GameState.hasClue('court_phone_register_copy') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА · НОМЕР 17</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-court-directory" class="card text-left" ${GameState.hasClue('court_extension_directory') ? 'disabled' : ''}>
            <p class="card-title">СПРАВОЧНИК ВНУТРЕННИХ НОМЕРОВ</p><p class="card-subtitle">Выяснить, где установлен телефон 17.</p>
          </button>
          <button id="btn-court-access" class="card text-left" ${GameState.hasClue('court_access_ledger') ? 'disabled' : ''}>
            <p class="card-title">ЖУРНАЛ КЛЮЧЕЙ ОХРАНЫ</p><p class="card-subtitle">Проверить, кто мог попасть в комнату.</p>
          </button>
        </div>
      </div>

      <div id="court-witnesses" class="mb-6" ${GameState.hasClue('court_access_ledger') ? '' : 'hidden'}>
        <p class="text-gold text-xs tracking-widest mb-3">ПРОВЕРКА ДОСТУПА · СВИДЕТЕЛИ И КЛЮЧИ</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button id="btn-guard-testimony" class="card text-left" ${GameState.hasClue('guard_key_testimony') ? 'disabled' : ''}>
            <p class="card-title">ОПРОСИТЬ НОЧНОГО ОХРАННИКА</p><p class="card-subtitle">Восстановить его дежурство у комнаты секретарей.</p>
          </button>
          <button id="btn-spare-key" class="card text-left" ${GameState.hasClue('spare_key_inventory') ? 'disabled' : ''}>
            <p class="card-title">ПРОВЕРИТЬ ОПИСЬ РЕЗЕРВНЫХ КЛЮЧЕЙ</p><p class="card-subtitle">Сверить слова охранника с учётом хозяйственной службы.</p>
          </button>
        </div>
      </div>

      <div class="court-clues-panel">
        <p class="text-gray-500 text-xs mb-2">НАЙДЕННЫЕ УЛИКИ:</p>
        <div id="found-clues" class="text-gold text-xs"></div>
      </div>
    </div>
  `;

  updateCluesList();

  container.querySelectorAll('.court-hotspot').forEach(function(button) {
    button.addEventListener('click', function() {
      container.querySelector('#' + button.dataset.trigger)?.click();
    });
  });

  document.getElementById('btn-zone-body').addEventListener('click', function() {
    if (!GameState.hasClue('body_examination')) {
      GameState.addClue({
        id: 'body_examination',
        name: 'Осмотр тела судьи',
        category: 'observation',
        description: 'Судья был отравлен. На запястьях — следы от верёвок. Глаза завязаны при жизни. Убийца хотел, чтобы он знал, что умирает.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Вы опускаетесь на корточки рядом с меловым контуром. Судья Гаррисон. Двадцать лет на скамье. Двадцать лет он решал судьбы. ' +
        'Теперь кто-то решил его судьбу. На запястьях — характерные ссадины: его связывали. Но не били. Не пытали. ' +
        'Его просто заставили ждать. Судья знал, что умирает. Убийца дал ему время подумать о всех вынесенных приговорах.',
        'Осмотр тела судьи'
      );
    } else {
      showNarrative('Вы уже осмотрели тело. Мел, кровь, верёвки — картина ясна. Но что-то в этом деле всё ещё ускользает.');
    }
  });

  document.getElementById('btn-zone-wall').addEventListener('click', function() {
    if (!GameState.hasClue('wall_inscription')) {
      GameState.addClue({
        id: 'wall_inscription',
        name: 'Надпись на стене',
        category: 'observation',
        description: '«СЛЕПОЕ ПРАВОСУДИЕ» — написано кровью жертвы. Отсылка к Фемиде, богине правосудия, которую изображают с завязанными глазами.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Вы проводите пальцем в сантиметре от надписи. Кровь судьи. Убийца макал палец в рану и выводил каждую букву медленно, почти любовно. ' +
        'Фемида. Богиня с завязанными глазами. Беспристрастное правосудие. Вот только глаза судье завязали не для беспристрастности — а чтобы он не видел лица своего палача. ' +
        'Или чтобы не видел, как тот улыбается.',
        'Надпись на стене'
      );
    } else {
      showNarrative('Надпись уже изучена. «СЛЕПОЕ ПРАВОСУДИЕ» — послание тому, кто умеет читать между строк.');
    }
  });

  document.getElementById('btn-zone-scales').addEventListener('click', function() {
    if (!GameState.hasClue('broken_scales')) {
      GameState.addClue({
        id: 'broken_scales',
        name: 'Сломанные весы',
        category: 'object',
        description: 'Одна чаша весов сломана пополам. На второй — отпечаток пальца. Убийца сделал это намеренно.',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'Весы Фемиды — символ правосудия — валяются на полу. Одна чаша расколота надвое. Вы поднимаете вторую: на ней чёткий отпечаток пальца. ' +
        'Убийца не пытался его стереть. Он хотел, чтобы вы его нашли. Он играет с вами. И пока что — ведёт в счёте.',
        'Сломанные весы'
      );
    } else {
      showNarrative('Вы уже осмотрели весы. Отпечаток пальца — улика или приглашение? Этот убийца ничего не делает случайно.');
    }
  });

  document.getElementById('btn-zone-desk').addEventListener('click', function() {
    if (!GameState.hasClue('judge_notes')) {
      GameState.addClue({
        id: 'judge_notes',
        name: 'Записи судьи',
        category: 'document',
        description: 'В ящике стола — ежедневник. Последняя запись: «Он вернулся. Спустя 20 лет. Боюсь, что справедливость настигнет нас всех».',
        location: 'crime_scene_court',
        day: 1
      });
      showNarrative(
        'В ящике стола — ежедневник в кожаном переплёте. Судья вёл записи почти тридцать лет. Вы пролистываете страницы: ' +
        'заседания, приговоры, фамилии. А потом — пустые страницы. И наконец, последняя запись, сделанная дрожащей рукой: ' +
        '<br><br><em>«Он вернулся. Спустя 20 лет. Я думал, мы похоронили это дело вместе с ней. Но мёртвые не молчат. ' +
        'Он придёт за всеми нами. И знаете что? Мы это заслужили.»</em>',
        'Записи судьи'
      );
    } else {
      showNarrative('Вы перечитываете записи судьи. Двадцать лет. Дело, которое пытались похоронить. Кто "она"? И кто "он"?');
    }
  });

  async function inspectCourtRecord(buttonId, clueId, narrative, prerequisite = 'court_phone_register_copy') {
    if (!GameState.hasClue(prerequisite) || GameState.hasClue(clueId)) return;
    const button = container.querySelector('#' + buttonId);
    button.disabled = true;
    try {
      const response = await fetch('src/data/clues.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const catalog = await response.json();
      if (!catalog[clueId]) throw new Error('Не найдена запись в каталоге');
      GameState.addClue(catalog[clueId]);
      if (clueId === 'court_access_ledger') container.querySelector('#court-witnesses').hidden = false;
      showNarrative(narrative, catalog[clueId].name);
    } catch (error) {
      button.disabled = false;
      console.error('[Court] Не удалось открыть документ:', error);
      showNarrative('Документ пока не удалось получить. Повторите проверку.', 'АРХИВ НЕДОСТУПЕН');
    }
  }

  container.querySelector('#btn-court-directory').addEventListener('click', function() {
    inspectCourtRecord('btn-court-directory', 'court_extension_directory',
      'В старом справочнике под номером 17 значится общая комната секретарей. Не кабинет судьи и не личный телефон. Сотрудники могли пользоваться аппаратом по очереди — нужна проверка доступа.');
  });
  container.querySelector('#btn-court-access').addEventListener('click', function() {
    inspectCourtRecord('btn-court-access', 'court_access_ledger',
      'Охрана записала: ключ от комнаты секретарей вернули в 19:40, до 22:00 доступ закрыт. Но в 20:15 с номера 17 кто-то звонил в участок. Ошибка в журнале? Запасной ключ? Пока это только расхождение документов.');
  });
  container.querySelector('#btn-guard-testimony').addEventListener('click', function() {
    inspectCourtRecord('btn-guard-testimony', 'guard_key_testimony',
      'Виктор Белл, ночной охранник, уверяет: «В 19:40 ключ вернули. Запасного у нас вообще нет. Коридор с восьми до половины девятого был пуст». На вопрос о непрерывном наблюдении он уточняет: «Я уходил на обход, но ненадолго». Его слова нужно сверить с учётом ключей.',
      'court_access_ledger');
  });
  container.querySelector('#btn-spare-key').addEventListener('click', function() {
    inspectCourtRecord('btn-spare-key', 'spare_key_inventory',
      'В хозяйственной описи значится запасной ключ от комнаты секретарей. Он числится в опечатанном шкафу, но отметки о проверке пломбы в тот день нет. Это ещё не доказательство вскрытия шкафа — однако слова охранника о единственном ключе неверны.',
      'court_access_ledger');
  });

  document.getElementById('btn-leave').addEventListener('click', function() {
    Events.emit('navigate', { scene: 'city-map' });
  });

  function showNarrative(text, title) {
    var notification = document.createElement('div');
    notification.className = 'fixed inset-0 z-30 flex items-center justify-center p-4';
    notification.innerHTML = `
      <div class="bg-noir-950 border border-gold p-6 max-w-lg w-full animate-fade-in">
        <p class="text-gold text-xs tracking-widest mb-3">${title || 'НАХОДКА'}</p>
        <p class="text-gray-300 text-sm leading-relaxed">${text}</p>
        <button class="btn-noir text-xs py-2 mt-4 close-narrative">ПРИНЯТЬ К СВЕДЕНИЮ</button>
      </div>
    `;
    document.body.appendChild(notification);

    notification.querySelector('.close-narrative').addEventListener('click', function() {
      notification.remove();
      updateCluesList();
    });
  }

  function updateCluesList() {
    var cluesEl = document.getElementById('found-clues');
    if (cluesEl) {
      var clueIds = ['body_examination', 'wall_inscription', 'broken_scales', 'judge_notes'];
      var clues = GameState.currentCase.clues.filter(function(clue) { return clueIds.includes(clue.id); });
      container.querySelectorAll('.court-hotspot').forEach(function(button) {
        var index = ['btn-zone-body', 'btn-zone-wall', 'btn-zone-scales', 'btn-zone-desk'].indexOf(button.dataset.trigger);
        button.classList.toggle('is-found', GameState.hasClue(clueIds[index]));
      });
      if (clues.length === 0) {
        cluesEl.innerHTML = '<span class="text-gray-600">Пока ничего не найдено</span>';
      } else {
        cluesEl.innerHTML = clues.map(function(c) {
          return '<span class="mr-2">📎 ' + c.name + '</span>';
        }).join('');
      }
    }
  }
}
