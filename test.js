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

function renderResume() {
  $('r-name').textContent = val('f-name') || 'Ваше имя';
  $('r-position').textContent = val('f-position');
  $('r-email').textContent = val('f-email');
  $('r-contacts').innerHTML = [val('f-phone'), val('f-location')].filter(Boolean)
    .map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');

  var summary = val('f-summary');
  $('r-summary').textContent = summary;
  showSection('s-summary', !!summary);

  var job = entryHtml(val('f-job-title'), val('f-job-company'), val('f-job-period'), val('f-job-desc'));
  $('r-job').innerHTML = job;
  showSection('s-job', !!job);

  var edu = entryHtml(val('f-edu-school'), val('f-edu-degree'), val('f-edu-period'), '');
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
      // Красивые стили (используем Tailwind, как в твоем проекте)
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


renderResume();