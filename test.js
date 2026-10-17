function showTab(tabId) {
  document.querySelectorAll('.tabcontent').forEach(function (el) { el.classList.add('hidden'); });
  document.querySelectorAll('.tablinks').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.getElementById(tabId).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openTab(evt, tabId) { showTab(tabId); }

function $(id) { return document.getElementById(id); }
function val(id) { return $(id).value.trim(); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function skillPill(text) {
  return '<span class="inline-block text-sm bg-gray-100 px-3 py-1.5 rounded-md mr-2 mb-2">' + escapeHtml(text) + '</span>';
}

function showSection(id, visible) {
  $(id).classList.toggle('hidden', !visible);
}

// Запись: жирный заголовок слева, период справа, подзаголовок, маркированные строки
function entryHtml(title, sub, period, desc) {
  if (!title && !sub && !period && !desc) return '';
  var lines = (desc || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  return '<div class="flex justify-between items-start gap-4">' +
      '<div class="font-bold">' + escapeHtml(title) + '</div>' +
      '<div class="text-sm shrink-0">' + escapeHtml(period) + '</div>' +
    '</div>' +
    (sub ? '<div>' + escapeHtml(sub) + '</div>' : '') +
    (lines.length
      ? '<ul class="list-disc pl-5 mt-1 text-sm space-y-1">' + lines.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
      : '');
}

// ===== Даты: "2021-03" -> "Март 2021" =====
var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
              'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function fmtMonth(v) {
  if (!v) return '';
  var p = v.split('-');
  return MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}

// ===== Красивый выбор месяца (вместо input type="month") =====
var monthPickers = {};

function closePickers() {
  Object.keys(monthPickers).forEach(function (k) { monthPickers[k].close(); });
}

function createMonthPicker(box) {
  var id = box.dataset.id;
  var rightAlign = box.dataset.align === 'right';

  box.innerHTML =
    '<input type="hidden" id="' + id + '">' +
    '<button type="button" class="mp-btn inp flex items-center justify-between gap-2 text-left disabled:opacity-40 disabled:cursor-not-allowed">' +
      '<span class="mp-text text-gray-500">Выберите</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-5 h-5 shrink-0 text-black/45">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />' +
      '</svg>' +
    '</button>';

  // Окошко лежит прямо в <body>, а не внутри модалки: так его позиция всегда считается от экрана
  var pop = document.createElement('div');
  pop.className = 'mp-pop hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xl';
  pop.style.position = 'fixed';
  pop.style.width = '288px';
  pop.style.zIndex = '60';
  document.body.appendChild(pop);

  var hidden = box.querySelector('input');
  var btn = box.querySelector('.mp-btn');
  var text = box.querySelector('.mp-text');
  var year = new Date().getFullYear();
  var min = '';
  var api;

  function label() {
    text.textContent = hidden.value ? fmtMonth(hidden.value) : 'Выберите';
    text.classList.toggle('text-gray-500', !hidden.value);
    text.classList.toggle('text-black', !!hidden.value);
  }

  function close() { pop.classList.add('hidden'); }

  function draw() {
    var html =
      '<div class="flex items-center justify-between mb-2">' +
        '<button type="button" data-nav="-1" class="h-8 w-8 rounded-full text-xl leading-none hover:bg-gray-100">&lsaquo;</button>' +
        '<span class="font-semibold">' + year + '</span>' +
        '<button type="button" data-nav="1" class="h-8 w-8 rounded-full text-xl leading-none hover:bg-gray-100">&rsaquo;</button>' +
      '</div><div class="grid grid-cols-3 gap-1">';
    MONTHS.forEach(function (m, i) {
      var v = year + '-' + String(i + 1).padStart(2, '0');
      var on = v === hidden.value;
      var off = min && v < min;
      html += '<button type="button" data-month="' + v + '"' + (off ? ' disabled' : '') +
        ' class="rounded-xl py-2 text-sm ' + (on ? 'bg-black text-white' : off ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100') + '">' +
        m.slice(0, 3) + '</button>';
    });
    html += '</div><div class="mt-2 flex justify-between text-sm">' +
      '<button type="button" data-clear class="px-2 py-1 text-gray-500 hover:text-black">Очистить</button>' +
      '<button type="button" data-today class="px-2 py-1 text-gray-500 hover:text-black">Этот месяц</button></div>';
    pop.innerHTML = html;
  }

  // Сначала пробуем открыть вниз; вверх — только если снизу не хватает места, а сверху его больше
  function place() {
    var r = btn.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight, vh = window.innerHeight;
    var left = rightAlign ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var below = vh - r.bottom - 8;
    var above = r.top - 8;
    var top = (below >= h || below >= above) ? r.bottom + 8 : r.top - 8 - h;
    top = Math.max(8, Math.min(top, vh - h - 8));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function choose(v) {
    api.set(v);
    close();
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }

  btn.addEventListener('click', function () {
    var wasOpen = !pop.classList.contains('hidden');
    closePickers();
    if (wasOpen) return;
    year = hidden.value ? Number(hidden.value.slice(0, 4)) : (min ? Number(min.slice(0, 4)) : new Date().getFullYear());
    draw();
    pop.classList.remove('hidden');
    place();
    requestAnimationFrame(place); // страховка: пересчёт после того, как применились стили
  });

  pop.addEventListener('click', function (e) {
    e.stopPropagation(); // иначе после перерисовки документ решит, что клик был «снаружи»
    var t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.nav) { year += Number(t.dataset.nav); draw(); }
    else if (t.dataset.month) choose(t.dataset.month);
    else if ('clear' in t.dataset) choose('');
    else if ('today' in t.dataset) {
      var d = new Date();
      var v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!min || v >= min) choose(v);
    }
  });

  api = {
    get: function () { return hidden.value; },
    set: function (v) { hidden.value = v || ''; label(); },
    setDisabled: function (b) { btn.disabled = b; if (b) close(); },
    setMin: function (v) { min = v || ''; },
    setError: function (b) {
      btn.classList.toggle('ring-2', b);
      btn.classList.toggle('ring-red-500', b);
    },
    close: close
  };
  monthPickers[id] = api;

  draw(); // прогрев: Tailwind заранее создаёт стили, чтобы первое открытие не «скакало»
}

document.querySelectorAll('.mp').forEach(createMonthPicker);

document.addEventListener('click', function (e) {
  if (!e.target.closest('.mp')) closePickers();
});
document.addEventListener('scroll', closePickers, true);
window.addEventListener('resize', closePickers);

// блокирует «Окончание» при галочке и не даёт выбрать конец раньше начала
function syncEnd(p) {
  var end = monthPickers['f-' + p + '-end'];
  end.setDisabled($('f-' + p + '-current').checked);
  end.setMin(val('f-' + p + '-start'));
  end.setError(false);
}

['edu', 'job'].forEach(function (p) {
  ['-current', '-start', '-end'].forEach(function (s) {
    $('f-' + p + s).addEventListener('change', function () { syncEnd(p); });
  });
});

// ===== Аватар: сначала окно обрезки, потом сохранение =====
// ===== Аватар: клик по фото сразу открывает редактирование =====
var avatarData = '';
var avatarSource = null; // исходное фото и положение рамки — чтобы править без повторной загрузки

function setAvatar(dataUrl) {
  avatarData = dataUrl || '';
  if (!avatarData) avatarSource = null;
  $('avatar-img').src = avatarData;
  $('avatar-img').classList.toggle('hidden', !avatarData);
  $('avatar-ph').classList.toggle('hidden', !!avatarData);
  $('avatar-remove').classList.toggle('hidden', !avatarData);
  $('avatar-pick').textContent = avatarData ? 'Сменить фото' : 'Загрузить фото';
  renderResume();
}

$('avatar-pick').addEventListener('click', function () { $('f-avatar').click(); });
$('avatar-remove').addEventListener('click', function () { setAvatar(''); });

// клик по самому кружку: есть фото — открываем редактор, нет — выбор файла
$('avatar-circle').addEventListener('click', function () {
  if (avatarSource) openCropModal(avatarSource.img, avatarSource.src, avatarSource);
  else $('f-avatar').click();
});

// состояние обрезки: x, y — смещение фото внутри рамки (px), base — масштаб «фото закрывает рамку», zoom — приближение
var crop = { img: null, F: 288, base: 1, zoom: 1, x: 0, y: 0 };

function cropClamp() {
  var s = crop.base * crop.zoom;
  var w = crop.img.naturalWidth * s, h = crop.img.naturalHeight * s;
  crop.x = Math.min(0, Math.max(crop.F - w, crop.x));
  crop.y = Math.min(0, Math.max(crop.F - h, crop.y));
}

function cropRender() {
  var s = crop.base * crop.zoom, el = $('crop-img');
  el.style.width = crop.img.naturalWidth * s + 'px';
  el.style.height = crop.img.naturalHeight * s + 'px';
  el.style.left = crop.x + 'px';
  el.style.top = crop.y + 'px';
}

// приближение относительно центра рамки
function setZoom(z) {
  z = Math.max(1, Math.min(4, z));
  var c = crop.F / 2, k0 = crop.base * crop.zoom, k1 = crop.base * z;
  crop.x = c - (c - crop.x) / k0 * k1;
  crop.y = c - (c - crop.y) / k0 * k1;
  crop.zoom = z;
  $('crop-zoom').value = z;
  cropClamp();
  cropRender();
}

// saved — сохранённое положение (если открываем уже добавленное фото)
function openCropModal(img, src, saved) {
  crop.img = img;
  crop.F = $('crop-frame').clientWidth;
  crop.base = crop.F / Math.min(img.naturalWidth, img.naturalHeight);
  crop.zoom = saved ? saved.zoom : 1;
  var s = crop.base * crop.zoom;
  crop.x = saved ? saved.nx * crop.F : (crop.F - img.naturalWidth * s) / 2;
  crop.y = saved ? saved.ny * crop.F : (crop.F - img.naturalHeight * s) / 2;
  cropClamp();
  $('crop-zoom').value = crop.zoom;
  $('crop-img').src = src;
  cropRender();
  $('crop-modal').classList.add('open');
}

function closeCropModal() {
  $('crop-modal').classList.remove('open');
}

$('f-avatar').addEventListener('change', function () {
  var input = this;
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    var img = new Image();
    img.onload = function () { openCropModal(img, reader.result, null); };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
});

(function () {
  var frame = $('crop-frame'), drag = null;
  frame.addEventListener('pointerdown', function (e) {
    drag = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener('pointermove', function (e) {
    if (!drag) return;
    crop.x = drag.x + e.clientX - drag.px;
    crop.y = drag.y + e.clientY - drag.py;
    cropClamp();
    cropRender();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    frame.addEventListener(t, function () { drag = null; });
  });
  frame.addEventListener('wheel', function (e) {
    e.preventDefault();
    setZoom(crop.zoom - e.deltaY * 0.002);
  }, { passive: false });
})();

$('crop-zoom').addEventListener('input', function () { setZoom(Number(this.value)); });

$('crop-ok-btn').addEventListener('click', function () {
  // вырезаем ровно то, что видно в рамке, и сжимаем до 400x400
  var s = crop.base * crop.zoom, size = 400, c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(crop.img, -crop.x / s, -crop.y / s, crop.F / s, crop.F / s, 0, 0, size, size);
  setAvatar(c.toDataURL('image/jpeg', 0.9));
  // запоминаем исходник и положение рамки, чтобы клик по фото снова открыл редактор
  avatarSource = { img: crop.img, src: crop.img.src, zoom: crop.zoom, nx: crop.x / crop.F, ny: crop.y / crop.F };
  closeCropModal();
});

$('crop-cancel-btn').addEventListener('click', closeCropModal);

$('crop-modal').addEventListener('click', function (ev) {
  if (ev.target === $('crop-modal')) closeCropModal(); // клик по затемнённому фону
});

// ===== Выпадающий список «Уровень образования» (плавный) =====
var EDU_LEVELS = ['Среднее', 'Среднее специальное', 'Неоконченное высшее', 'Высшее',
                  'Бакалавр', 'Магистр', 'Кандидат наук', 'Доктор наук'];

function initEduLevel() {
  var btn = $('edu-level-btn'), list = $('edu-level-list'), items = $('edu-level-items'),
      arrow = $('edu-level-arrow'), text = $('edu-level-text'), input = $('f-edu-level');

  function toggle(open) {
    list.classList.toggle('open', open);
    arrow.classList.toggle('rotate-180', open);
  }

  function draw() {
    items.innerHTML = EDU_LEVELS.map(function (level) {
      var on = level === input.value;
      return '<button type="button" data-level="' + level + '" class="w-full flex items-center gap-3 rounded-full px-3 py-3 text-left text-base ' +
        (on ? 'border-2 border-blue-300' : 'border-2 border-transparent hover:bg-gray-50') + '">' +
        '<span class="flex h-6 w-6 items-center justify-center rounded-full border ' +
        (on ? 'border-blue-600 bg-blue-600' : 'border-gray-300') + '">' +
        (on ? '<span class="h-2 w-2 rounded-full bg-white"></span>' : '') + '</span>' + level + '</button>';
    }).join('');
  }

  btn.addEventListener('click', function () {
    var open = !list.classList.contains('open');
    if (open) draw();
    toggle(open);
  });

  items.addEventListener('click', function (e) {
    var item = e.target.closest('[data-level]');
    if (!item) return;
    input.value = item.dataset.level;
    text.textContent = input.value;
    text.classList.remove('text-gray-400');
    text.classList.add('text-black');
    toggle(false);
    input.dispatchEvent(new Event('input', { bubbles: true })); // обновит превью
  });

  document.addEventListener('click', function (e) {
    if (!$('edu-level').contains(e.target)) toggle(false);
  });
}

initEduLevel();

// ===== Список образований + модальное окно =====
var eduList = [];
var eduEditing = null; // индекс редактируемой записи или null для новой

function eduSub(e) { return [e.level, e.degree].filter(Boolean).join(', '); }

function eduPeriod(e) {
  var start = fmtMonth(e.start);
  var end = e.current ? 'по настоящее время' : fmtMonth(e.end);
  if (start && end) return start + ' – ' + end;
  return start || end;
}

function renderEduCards() {
  $('edu-cards').innerHTML = eduList.map(function (e, i) {
    var period = eduPeriod(e);
    return '<div data-i="' + i + '" class="cursor-pointer rounded-xl border border-gray-300 p-3 hover:bg-gray-50 transition">' +
      '<div class="font-semibold">' + escapeHtml(e.school || 'Без названия') + '</div>' +
      (eduSub(e) ? '<div class="text-sm text-gray-600">' + escapeHtml(eduSub(e)) + '</div>' : '') +
      (period ? '<div class="text-xs text-gray-500">' + escapeHtml(period) + '</div>' : '') +
      '</div>';
  }).join('');
}

function setEduLevel(level) {
  $('f-edu-level').value = level || '';
  var t = $('edu-level-text');
  t.textContent = level || 'Выберите';
  t.classList.toggle('text-gray-400', !level);
  t.classList.toggle('text-black', !!level);
}

function openEduModal(index) {
  eduEditing = index;
  var e = index === null ? {} : eduList[index];
  setEduLevel(e.level);
  $('f-edu-school').value = e.school || '';
  $('f-edu-degree').value = e.degree || '';
  monthPickers['f-edu-start'].set(e.start);
  monthPickers['f-edu-end'].set(e.end);
  $('f-edu-current').checked = !!e.current;
  syncEnd('edu');
  $('edu-level-list').classList.remove('open');
  $('edu-level-arrow').classList.remove('rotate-180');
  $('edu-delete-btn').classList.toggle('hidden', index === null);
  $('edu-modal').classList.add('open');
}

function closeEduModal() {
  closePickers();
  $('edu-modal').classList.remove('open');
  eduEditing = null;
}

$('add-edu-btn').addEventListener('click', function () { openEduModal(null); });

$('edu-cards').addEventListener('click', function (ev) {
  var card = ev.target.closest('[data-i]');
  if (card) openEduModal(Number(card.dataset.i));
});

$('edu-save-btn').addEventListener('click', function () {
  var current = $('f-edu-current').checked;
  var entry = {
    level: val('f-edu-level'),
    school: val('f-edu-school'),
    degree: val('f-edu-degree'),
    start: val('f-edu-start'),
    end: current ? '' : val('f-edu-end'),
    current: current
  };

  // окончание не может быть раньше начала
  if (entry.start && entry.end && entry.end < entry.start) {
    monthPickers['f-edu-end'].setError(true);
    return;
  }

  var empty = !entry.level && !entry.school && !entry.degree && !entry.start && !entry.end && !entry.current;
  if (!empty) {
    // новая запись — наверх списка, правка остаётся на своём месте
    if (eduEditing === null) eduList.unshift(entry); else eduList[eduEditing] = entry;
  }
  closeEduModal();
  renderEduCards();
  renderResume();
});

$('edu-delete-btn').addEventListener('click', function () {
  if (eduEditing !== null) eduList.splice(eduEditing, 1);
  closeEduModal();
  renderEduCards();
  renderResume();
});

$('edu-cancel-btn').addEventListener('click', closeEduModal);

$('edu-modal').addEventListener('click', function (ev) {
  if (ev.target === $('edu-modal')) closeEduModal(); // клик по затемнённому фону
});

// ===== Список опыта работы + модальное окно =====
var jobList = [];
var jobEditing = null; // индекс редактируемой записи или null для новой

function jobPeriod(j) {
  var start = fmtMonth(j.start);
  var end = j.current ? 'по настоящее время' : fmtMonth(j.end);
  if (start && end) return start + ' – ' + end;
  return start || end;
}

function renderJobCards() {
  $('job-cards').innerHTML = jobList.map(function (j, i) {
    var period = jobPeriod(j);
    return '<div data-i="' + i + '" class="cursor-pointer rounded-xl border border-gray-300 p-3 hover:bg-gray-50 transition">' +
      '<div class="font-semibold">' + escapeHtml(j.title || 'Без названия') + '</div>' +
      (j.company ? '<div class="text-sm text-gray-600">' + escapeHtml(j.company) + '</div>' : '') +
      (period ? '<div class="text-xs text-gray-500">' + escapeHtml(period) + '</div>' : '') +
      '</div>';
  }).join('');
}

function openJobModal(index) {
  jobEditing = index;
  var j = index === null ? {} : jobList[index];
  $('f-job-title').value = j.title || '';
  $('f-job-company').value = j.company || '';
  monthPickers['f-job-start'].set(j.start);
  monthPickers['f-job-end'].set(j.end);
  $('f-job-current').checked = !!j.current;
  $('f-job-desc').value = j.desc || '';
  syncEnd('job');
  $('job-delete-btn').classList.toggle('hidden', index === null);
  $('job-modal').classList.add('open');
}

function closeJobModal() {
  closePickers();
  $('job-modal').classList.remove('open');
  jobEditing = null;
}

$('add-job-btn').addEventListener('click', function () { openJobModal(null); });

$('job-cards').addEventListener('click', function (ev) {
  var card = ev.target.closest('[data-i]');
  if (card) openJobModal(Number(card.dataset.i));
});

$('job-save-btn').addEventListener('click', function () {
  var current = $('f-job-current').checked;
  var entry = {
    title: val('f-job-title'),
    company: val('f-job-company'),
    start: val('f-job-start'),
    end: current ? '' : val('f-job-end'),
    current: current,
    desc: val('f-job-desc')
  };

  // окончание не может быть раньше начала
  if (entry.start && entry.end && entry.end < entry.start) {
    monthPickers['f-job-end'].setError(true);
    return;
  }

  var empty = !entry.title && !entry.company && !entry.start && !entry.end && !entry.current && !entry.desc;
  if (!empty) {
    // новая запись — наверх списка, правка остаётся на своём месте
    if (jobEditing === null) jobList.unshift(entry); else jobList[jobEditing] = entry;
  }
  closeJobModal();
  renderJobCards();
  renderResume();
});

$('job-delete-btn').addEventListener('click', function () {
  if (jobEditing !== null) jobList.splice(jobEditing, 1);
  closeJobModal();
  renderJobCards();
  renderResume();
});

$('job-cancel-btn').addEventListener('click', closeJobModal);

$('job-modal').addEventListener('click', function (ev) {
  if (ev.target === $('job-modal')) closeJobModal(); // клик по затемнённому фону
});

// Esc закрывает календарь и окна
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') { closePickers(); closeEduModal(); closeJobModal(); closeCropModal(); }
});

// ===== Телефон (+998) и email (@gmail.com) =====
// цифры номера без кода страны: не больше 9, код +998 стереть нельзя
function localDigits(raw) {
  var d = String(raw || '').replace(/\D/g, '');
  if (d.indexOf('998') === 0) d = d.slice(3);
  else if (d.length < 3 && '998'.indexOf(d) === 0) d = ''; // стёрли часть кода — оставляем код целым
  return d.slice(0, 9);
}

// "901234567" -> "+998 90 123 45 67"
function formatPhone(d) {
  var out = '+998';
  if (d.length) out += ' ' + d.slice(0, 2);
  if (d.length > 2) out += ' ' + d.slice(2, 5);
  if (d.length > 5) out += ' ' + d.slice(5, 7);
  if (d.length > 7) out += ' ' + d.slice(7, 9);
  return out;
}

function phoneOut() {
  var d = localDigits($('f-phone').value);
  return d ? formatPhone(d) : '';
}

function emailFull() {
  var v = val('f-email');
  return v ? v + '@gmail.com' : '';
}

function phoneRing(on) {
  $('f-phone').classList.toggle('ring-2', on);
  $('f-phone').classList.toggle('ring-red-500', on);
}

$('f-phone').addEventListener('focus', function () {
  if (!this.value) this.value = '+998 ';
});

$('f-phone').addEventListener('input', function () {
  this.value = formatPhone(localDigits(this.value));
  phoneRing(false);
});

$('f-phone').addEventListener('blur', function () {
  var d = localDigits(this.value);
  if (!d) this.value = '';
  phoneRing(d.length > 0 && d.length < 9); // номер введён не до конца
});

// в поле email остаётся только часть до @ — домен @gmail.com закреплён справа
$('f-email').addEventListener('input', function () {
  this.value = this.value.split('@')[0].replace(/[^a-zA-Z0-9._+-]/g, '');
});

// ===== Превью =====
function renderResume() {
  var av = $('r-avatar');
  av.classList.toggle('hidden', !avatarData);
  if (avatarData) av.src = avatarData;

  $('r-name').textContent = val('f-name') || 'Ваше имя';
  $('r-position').textContent = val('f-position');
  $('r-email').textContent = emailFull();
  $('r-contacts').innerHTML = [phoneOut(), val('f-location')].filter(Boolean)
    .map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');

  var summary = val('f-summary');
  $('r-summary').textContent = summary;
  showSection('s-summary', !!summary);

  var job = jobList.map(function (j) {
    return '<div class="mb-4 last:mb-0">' + entryHtml(j.title, j.company, jobPeriod(j), j.desc) + '</div>';
  }).join('');
  $('r-job').innerHTML = job;
  showSection('s-job', !!job);

  var edu = eduList.map(function (e) {
    return '<div class="mb-4 last:mb-0">' + entryHtml(e.school, eduSub(e), eduPeriod(e), '') + '</div>';
  }).join('');
  $('r-edu').innerHTML = edu;
  showSection('s-edu', !!edu);

  var skills = val('f-skills').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  $('r-skills').innerHTML = skills.map(skillPill).join('');
  showSection('s-skills', skills.length > 0);
}

document.querySelectorAll('#resume-form input, #resume-form textarea').forEach(function (el) {
  el.addEventListener('input', renderResume);
});

$('download-btn').addEventListener('click', function () {
  const name = val('f-name') || 'resume';
  html2pdf().set({
    margin: 10,
    filename: name.replace(/\s+/g, '_') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from($('resume-paper')).save();
});

// ===== Навыки (чипсы) =====
(function() {
  var skillsArray = []; // Тут храним добавленные навыки
  var input = $('f-skills-input');
  var wrapper = $('chips-wrapper');
  var hiddenInput = $('f-skills');

  if (!input || !wrapper || !hiddenInput) return;

  // Функция обновления скрытого инпута и запуска твоего рендеринга
  function updateSkills() {
    hiddenInput.value = skillsArray.join(', '); // Склеиваем через запятую для твоего renderResume
    renderResume(); // Твоя родная функция перерисовки превью
  }

  // Функция создания визуального чипса
  function renderChips() {
    wrapper.innerHTML = '';
    skillsArray.forEach(function(skill, index) {
      var chip = document.createElement('span');
      chip.className = 'inline-flex items-center text-sm bg-black/10 text-black/80 px-2.5 py-1 rounded-md';
      chip.innerHTML = escapeHtml(skill) + 
        '<button type="button" class="ml-1.5 text-black/80 hover:text-black/100 font-bold focus:outline-none" data-index="' + index + '">&times;</button>';
      wrapper.appendChild(chip);
    });
    updateSkills();
  }

  // Слушаем нажатие клавиш в поле ввода
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Запрещаем отправку формы по Enter
      var value = input.value.trim();
      
      // Если не пусто и такого навыка еще нет — добавляем
      if (value && !skillsArray.includes(value)) {
        skillsArray.push(value);
        input.value = ''; // Очищаем поле ввода
        renderChips(); // Перерисовываем чипсы
      }
    }
  });

  // Удаление чипса при клике на крестик
  wrapper.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      var index = parseInt(e.target.getAttribute('data-index'), 10);
      skillsArray.splice(index, 1); // Удаляем из массива
      renderChips(); // Перерисовываем
    }
  });
})();

renderEduCards();
renderJobCards();
renderResume();