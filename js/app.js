/* ============================================================
   app.js - Productivity Dashboard
   ============================================================ */


/* ================================================================
   0. UTILITIES
   ================================================================ */

/** Show a brief toast message at the bottom of the screen. */
function showToast(msg, duration) {
  if (duration === undefined) duration = 2500;
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.classList.remove('show'); }, duration);
}


/* ================================================================
   1. THEME  (light / dark)
   localStorage key: "pd_theme"
   ================================================================ */

var themeToggleBtn = document.getElementById('themeToggle');

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('pd_theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

// Sync button label to theme applied by inline head script
applyTheme(getCurrentTheme());

themeToggleBtn.addEventListener('click', function () {
  applyTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
});


/* ================================================================
   2. LIVE CLOCK & GREETING
   ================================================================ */

var clockTimeEl     = document.getElementById('clockTime');
var clockDateEl     = document.getElementById('clockDate');
var clockGreetingEl = document.getElementById('clockGreeting');

var DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var MONTHS = ['January','February','March','April','May','June',
              'July','August','September','October','November','December'];

function updateClock() {
  var now = new Date();
  var h   = String(now.getHours()).padStart(2, '0');
  var m   = String(now.getMinutes()).padStart(2, '0');
  var s   = String(now.getSeconds()).padStart(2, '0');
  clockTimeEl.textContent = h + ':' + m + ':' + s;

  clockDateEl.textContent =
    DAYS[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();

  var hour = now.getHours();
  var greeting = 'Good Night';
  if      (hour >= 5  && hour < 12) greeting = 'Good Morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good Evening';

  var name = localStorage.getItem('pd_name') || '';
  clockGreetingEl.textContent = name ? greeting + ', ' + name + '!' : greeting;
}

updateClock();
setInterval(updateClock, 1000);


/* ================================================================
   3. CUSTOM NAME IN GREETING
   localStorage key: "pd_name"
   ================================================================ */

var nameDisplayEl = document.getElementById('nameDisplay');
var nameFormEl    = document.getElementById('nameForm');
var nameInputEl   = document.getElementById('nameInput');
var nameSaveBtn   = document.getElementById('nameSaveBtn');
var nameCancelBtn = document.getElementById('nameCancelBtn');

function renderNameUI() {
  var saved = localStorage.getItem('pd_name') || '';
  nameDisplayEl.innerHTML = '';

  if (saved) {
    var nameText = document.createElement('span');
    nameText.className   = 'name-text';
    nameText.textContent = '👋 Hi, ' + saved;
    nameDisplayEl.appendChild(nameText);
  }

  var editBtn = document.createElement('button');
  editBtn.className   = 'btn btn--ghost btn--sm';
  editBtn.textContent = saved ? '✏️ Edit' : '+ Add your name';
  editBtn.setAttribute('aria-label', 'Edit your name');
  editBtn.addEventListener('click', function () {
    nameInputEl.value    = saved;
    nameFormEl.hidden    = false;
    nameDisplayEl.hidden = true;
    nameInputEl.focus();
  });
  nameDisplayEl.appendChild(editBtn);
}

function saveName() {
  var val = nameInputEl.value.trim();
  if (val) { localStorage.setItem('pd_name', val); }
  else     { localStorage.removeItem('pd_name'); }
  nameFormEl.hidden    = true;
  nameDisplayEl.hidden = false;
  renderNameUI();
  updateClock();
}

nameSaveBtn.addEventListener('click', saveName);
nameCancelBtn.addEventListener('click', function () {
  nameFormEl.hidden    = true;
  nameDisplayEl.hidden = false;
});
nameInputEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter')  saveName();
  if (e.key === 'Escape') nameCancelBtn.click();
});

renderNameUI();


/* ================================================================
   4. FOCUS TIMER  (custom Pomodoro duration)
   localStorage key: "pd_timer_mins"
   ================================================================ */

var timerDisplayEl  = document.getElementById('timerDisplay');
var timerStartBtn   = document.getElementById('timerStart');
var timerStopBtn    = document.getElementById('timerStop');
var timerResetBtn   = document.getElementById('timerReset');
var timerDurationEl = document.getElementById('timerDuration');
var timerSetBtn     = document.getElementById('timerSetBtn');

var savedMins      = parseInt(localStorage.getItem('pd_timer_mins') || '25', 10);
timerDurationEl.value = savedMins;

var timerDefault  = savedMins * 60;
var timerSeconds  = timerDefault;
var timerInterval = null;
var timerRunning  = false;

function formatTimerSecs(secs) {
  var m = String(Math.floor(secs / 60)).padStart(2, '0');
  var s = String(secs % 60).padStart(2, '0');
  return m + ':' + s;
}

function renderTimerDisplay() {
  timerDisplayEl.textContent = formatTimerSecs(timerSeconds);
}

timerStartBtn.addEventListener('click', function () {
  if (timerRunning || timerSeconds === 0) return;
  timerRunning = true;
  timerInterval = setInterval(function () {
    timerSeconds--;
    renderTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplayEl.textContent = '00:00';
      showToast('✅ Focus session complete! Take a break.');
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete!', { body: 'Time for a break! 🎉' });
      }
    }
  }, 1000);
});

timerStopBtn.addEventListener('click', function () {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
});

timerResetBtn.addEventListener('click', function () {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerDefault;
  renderTimerDisplay();
});

timerSetBtn.addEventListener('click', function () {
  var mins = parseInt(timerDurationEl.value, 10);
  if (isNaN(mins) || mins < 1 || mins > 120) {
    showToast('⚠️ Enter a value between 1 and 120 minutes.');
    return;
  }
  clearInterval(timerInterval);
  timerRunning  = false;
  timerDefault  = mins * 60;
  timerSeconds  = timerDefault;
  localStorage.setItem('pd_timer_mins', String(mins));
  renderTimerDisplay();
  showToast('⏱️ Timer set to ' + mins + (mins > 1 ? ' minutes.' : ' minute.'));
});

timerDurationEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') timerSetBtn.click();
});

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

renderTimerDisplay();


/* ================================================================
   5. TO-DO LIST
   localStorage key: "pd_tasks"  — each task: { id, text, done }
   Features: add, edit, toggle, delete, prevent duplicates, sort
   ================================================================ */

var taskInputEl    = document.getElementById('taskInput');
var taskAddBtn     = document.getElementById('taskAdd');
var taskListEl     = document.getElementById('taskList');
var modalOverlay   = document.getElementById('modalOverlay');
var modalInputEl   = document.getElementById('modalInput');
var modalSaveBtn   = document.getElementById('modalSave');
var modalCancelBtn = document.getElementById('modalCancel');

var editingTaskId = null;
var currentSort   = 'default';

/* -- Storage helpers -- */
function loadTasks() {
  try { return JSON.parse(localStorage.getItem('pd_tasks') || '[]'); }
  catch (e) { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem('pd_tasks', JSON.stringify(tasks));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* -- Sort tasks for display (does not mutate stored order) -- */
function getSortedTasks(tasks) {
  var copy = tasks.slice();
  if (currentSort === 'az')   return copy.sort(function (a, b) { return a.text.localeCompare(b.text); });
  if (currentSort === 'za')   return copy.sort(function (a, b) { return b.text.localeCompare(a.text); });
  if (currentSort === 'done') return copy.sort(function (a, b) { return Number(a.done) - Number(b.done); });
  return copy;
}

/* -- Render -- */
function renderTasks() {
  var tasks  = loadTasks();
  var sorted = getSortedTasks(tasks);
  taskListEl.innerHTML = '';

  if (sorted.length === 0) {
    taskListEl.innerHTML = '<li class="empty-msg">No tasks yet. Add one above!</li>';
    return;
  }

  sorted.forEach(function (task) {
    var li = document.createElement('li');
    li.className = 'task-item';

    var checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.done ? 'not done' : 'done'));
    checkbox.addEventListener('change', function () { toggleTask(task.id); });

    var label = document.createElement('span');
    label.className   = 'task-label' + (task.done ? ' done' : '');
    label.textContent = task.text;
    label.addEventListener('click', function () { toggleTask(task.id); });

    var actions = document.createElement('div');
    actions.className = 'task-actions';

    var editBtn = document.createElement('button');
    editBtn.className   = 'btn btn--edit';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);
    editBtn.addEventListener('click', function () { openEditModal(task.id); });

    var deleteBtn = document.createElement('button');
    deleteBtn.className   = 'btn btn--danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.text);
    deleteBtn.addEventListener('click', function () { deleteTask(task.id); });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(actions);
    taskListEl.appendChild(li);
  });
}

/* -- Add (with duplicate check) -- */
function addTask() {
  var text = taskInputEl.value.trim();
  if (!text) return;

  var tasks = loadTasks();
  var isDuplicate = tasks.some(function (t) {
    return t.text.toLowerCase() === text.toLowerCase();
  });

  if (isDuplicate) {
    showToast('⚠️ That task already exists!');
    taskInputEl.select();
    return;
  }

  tasks.push({ id: generateId(), text: text, done: false });
  saveTasks(tasks);
  taskInputEl.value = '';
  renderTasks();
}

/* -- Toggle done -- */
function toggleTask(id) {
  var tasks = loadTasks();
  var task  = tasks.find(function (t) { return t.id === id; });
  if (task) task.done = !task.done;
  saveTasks(tasks);
  renderTasks();
}

/* -- Edit modal -- */
function openEditModal(id) {
  var task = loadTasks().find(function (t) { return t.id === id; });
  if (!task) return;
  editingTaskId       = id;
  modalInputEl.value  = task.text;
  modalOverlay.hidden = false;
  modalInputEl.focus();
}

function closeModal() {
  editingTaskId       = null;
  modalOverlay.hidden = true;
  modalInputEl.value  = '';
}

function saveEdit() {
  var newText = modalInputEl.value.trim();
  if (!newText || !editingTaskId) return;

  var tasks = loadTasks();
  var isDuplicate = tasks.some(function (t) {
    return t.id !== editingTaskId && t.text.toLowerCase() === newText.toLowerCase();
  });
  if (isDuplicate) {
    showToast('⚠️ A task with that name already exists!');
    return;
  }

  var task = tasks.find(function (t) { return t.id === editingTaskId; });
  if (task) task.text = newText;
  saveTasks(tasks);
  closeModal();
  renderTasks();
}

modalSaveBtn.addEventListener('click', saveEdit);
modalCancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', function (e) {
  if (e.target === modalOverlay) closeModal();
});
modalInputEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter')  saveEdit();
  if (e.key === 'Escape') closeModal();
});

/* -- Delete -- */
function deleteTask(id) {
  saveTasks(loadTasks().filter(function (t) { return t.id !== id; }));
  renderTasks();
}

/* -- Sort buttons -- */
document.querySelectorAll('.sort-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    currentSort = btn.dataset.sort;
    document.querySelectorAll('.sort-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderTasks();
  });
});

taskAddBtn.addEventListener('click', addTask);
taskInputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') addTask(); });

renderTasks();


/* ================================================================
   6. QUICK LINKS
   localStorage key: "pd_links"  — each link: { id, name, url }
   ================================================================ */

var linkNameEl  = document.getElementById('linkName');
var linkUrlEl   = document.getElementById('linkUrl');
var linkAddBtn  = document.getElementById('linkAdd');
var linksGridEl = document.getElementById('linksGrid');

function loadLinks() {
  try { return JSON.parse(localStorage.getItem('pd_links') || '[]'); }
  catch (e) { return []; }
}

function saveLinks(links) {
  localStorage.setItem('pd_links', JSON.stringify(links));
}

function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function renderLinks() {
  var links = loadLinks();
  linksGridEl.innerHTML = '';

  if (links.length === 0) {
    linksGridEl.innerHTML = '<span class="empty-msg">No links yet. Add one above!</span>';
    return;
  }

  links.forEach(function (link) {
    var chip = document.createElement('div');
    chip.className = 'link-chip';

    var a       = document.createElement('a');
    a.href        = normalizeUrl(link.url);
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    a.textContent = link.name;

    var removeBtn = document.createElement('button');
    removeBtn.className   = 'link-remove';
    removeBtn.textContent = '×';
    removeBtn.title       = 'Remove ' + link.name;
    removeBtn.setAttribute('aria-label', 'Remove link: ' + link.name);
    removeBtn.addEventListener('click', function () { deleteLink(link.id); });

    chip.appendChild(a);
    chip.appendChild(removeBtn);
    linksGridEl.appendChild(chip);
  });
}

function addLink() {
  var name = linkNameEl.value.trim();
  var url  = linkUrlEl.value.trim();
  if (!name || !url) return;

  var links = loadLinks();
  links.push({ id: generateId(), name: name, url: url });
  saveLinks(links);
  linkNameEl.value = '';
  linkUrlEl.value  = '';
  renderLinks();
}

function deleteLink(id) {
  saveLinks(loadLinks().filter(function (l) { return l.id !== id; }));
  renderLinks();
}

linkAddBtn.addEventListener('click', addLink);
linkUrlEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') addLink(); });

renderLinks();
