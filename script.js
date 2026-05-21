// ===== STORAGE =====
const STORE_KEY = 'taskmaster_v3_tasks';
const SESSION_KEY = 'taskmaster_v3_sessions';
const THEME_KEY = 'taskmaster_v3_theme';

// ===== STATE =====
let tasks = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
let sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
let activeSessionKey = null;
let editId = null;
let activeFilter = 'all';
let activeSort = 'created';
let searchQuery = '';

// ===== UTILS =====
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatDateShort(key) {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function isOverdue(task) {
  if (!task.deadline || task.completed) return false;
  return new Date(task.deadline + 'T00:00:00') < new Date(new Date().toDateString());
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, icon = '✅') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span style="overflow:hidden;text-overflow:ellipsis">${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

function confetti(x, y) {
  const colors = ['#d97706','#059669','#0284c7','#dc2626','#a78bfa','#f59e0b'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${x+(Math.random()-0.5)*50}px;top:${y+(Math.random()-0.5)*30}px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${0.8+Math.random()*0.6}s;animation-delay:${Math.random()*0.2}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
}

// ===== LANDING =====
function runLanding() {
  const fill = $('landingProgress');
  const landing = $('landing');
  const app = $('appWrapper');
  const duration = 2400;
  const start = performance.now();
  function tick(now) {
    const pct = Math.min((now - start) / duration * 100, 100);
    fill.style.width = pct + '%';
    if (pct < 100) { requestAnimationFrame(tick); }
    else {
      setTimeout(() => {
        landing.classList.add('animate-out');
        app.classList.add('visible');
        landing.addEventListener('animationend', () => { landing.style.display = 'none'; }, { once: true });
      }, 260);
    }
  }
  requestAnimationFrame(tick);
}

// ===== SESSIONS =====
function ensureTodaySession() {
  const key = todayKey();
  if (!sessions.find(s => s.dateKey === key)) {
    sessions.push({ dateKey: key });
    save();
  }
  return key;
}

function startNewSession() {
  const key = todayKey();
  if (!sessions.find(s => s.dateKey === key)) {
    sessions.push({ dateKey: key });
    save();
  }
  activeSessionKey = key;
  renderSessionsPanel();
  renderTasksHeading();
  updateFABVisibility();
  render();
  toast('Started new day session!', '📅');
}

/**
 * FIX 1: "Start new day" button only visible when NOT already on today's session.
 * FIX 2: Sessions panel only shown when there are multiple sessions OR past sessions with tasks.
 * FIX 3: FAB hidden when viewing a past session (can't add tasks to the past).
 */
function renderSessionsPanel() {
  const today = todayKey();

  // Show sessions panel only when user has more than 1 session
  const hasMultipleSessions = sessions.length > 1;
  const hasTodaySession = !!sessions.find(s => s.dateKey === today);
  const hasPastTasksWithOnlySingleSession = sessions.length === 1 && tasks.filter(t => t.sessionKey === sessions[0].dateKey).length > 0 && sessions[0].dateKey !== today;

  if (!hasMultipleSessions && !hasPastTasksWithOnlySingleSession) {
    $('sessionsPanel').style.display = 'none';
    return;
  }

  $('sessionsPanel').style.display = 'block';

  const list = $('sessionsList');
  list.innerHTML = '';

  const sorted = [...sessions].sort((a,b) => b.dateKey.localeCompare(a.dateKey));

  sorted.forEach((session, i) => {
    const sessionTasks = tasks.filter(t => t.sessionKey === session.dateKey);
    const total = sessionTasks.length;
    const done = sessionTasks.filter(t => t.completed).length;
    const isToday = session.dateKey === today;
    const isActive = session.dateKey === activeSessionKey;

    const card = document.createElement('div');
    card.className = 'session-card' + (isActive ? ' active-session' : '');
    card.style.animationDelay = `${i * 0.06}s`;

    card.innerHTML = `
      <div class="session-left">
        <div class="session-date">${isToday ? '📅 Today' : formatDateShort(session.dateKey)}</div>
        <div class="session-meta">${total} task${total !== 1 ? 's' : ''} · ${done} completed</div>
      </div>
      <div class="session-right">
        ${total > 0 && done === total ? '<div class="session-done-dot"></div>' : ''}
        <div class="session-count">${total}</div>
        <button class="session-del-btn" title="Delete this day" aria-label="Delete day">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
        <div class="session-arrow">›</div>
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.session-del-btn')) return;
      activeSessionKey = session.dateKey;
      renderSessionsPanel();
      renderTasksHeading();
      updateFABVisibility();
      render();
    });

    card.querySelector('.session-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.dateKey);
    });

    list.appendChild(card);
  });

  // FIX: "Start new day" button only shown when the user is NOT on today's session
  // AND today's session doesn't already exist in the list
  const viewingToday = activeSessionKey === today;
  const todayExists = !!sessions.find(s => s.dateKey === today);
  const showNewDayBtn = !viewingToday || !todayExists;
  $('btnNewSession').style.display = showNewDayBtn ? 'flex' : 'none';
}

function renderTasksHeading() {
  const el = $('tasksHeadingDate');
  if (!activeSessionKey) { el.textContent = ''; return; }
  const isToday = activeSessionKey === todayKey();
  el.textContent = isToday ? 'Today' : formatDateShort(activeSessionKey);
}

/**
 * FAB visibility rules:
 * 1. Hide when viewing a past session (read-only).
 * 2. Hide when today's session has NO tasks — the empty state shows its own CTA button.
 * 3. Show only when viewing today AND at least one task exists.
 */
function updateFABVisibility() {
  const fab = $('fabBtn');
  const isViewingToday = activeSessionKey === todayKey();
  const todayTaskCount = tasks.filter(t => t.sessionKey === todayKey()).length;

  if (isViewingToday && todayTaskCount > 0) {
    fab.classList.remove('hidden');
  } else {
    fab.classList.add('hidden');
    if (!isViewingToday) closeModal();
  }
}

// ===== STATS =====
function updateStats() {
  const sessionTasks = activeSessionKey
    ? tasks.filter(t => t.sessionKey === activeSessionKey)
    : tasks;
  const total = sessionTasks.length;
  const done = sessionTasks.filter(t => t.completed).length;
  const active = total - done;
  const pct = total ? Math.round(done/total*100) : 0;

  $('statTotal').textContent = total;
  $('statActive').textContent = active;
  $('statDone').textContent = done;
  $('progressPct').textContent = pct + '%';
  $('progressFill').style.width = pct + '%';
  $('clearCompleted').style.display = done > 0 ? 'block' : 'none';
}

function updateDate() {
  const d = new Date();
  $('headerDate').textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}

// ===== FILTER & SORT =====
function getFiltered() {
  let list = activeSessionKey
    ? tasks.filter(t => t.sessionKey === activeSessionKey)
    : tasks;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.notes||'').toLowerCase().includes(q) ||
      (t.category||'').toLowerCase().includes(q)
    );
  }

  if (activeFilter === 'active') list = list.filter(t => !t.completed);
  else if (activeFilter === 'completed') list = list.filter(t => t.completed);
  else if (activeFilter === 'overdue') list = list.filter(t => isOverdue(t));

  const PRIO = { high:0, medium:1, low:2 };
  if (activeSort === 'priority') list.sort((a,b) => (PRIO[a.priority]||1) - (PRIO[b.priority]||1));
  else if (activeSort === 'deadline') list.sort((a,b) => { if(!a.deadline) return 1; if(!b.deadline) return -1; return new Date(a.deadline)-new Date(b.deadline); });
  else if (activeSort === 'alpha') list.sort((a,b) => a.title.localeCompare(b.title));
  else list.sort((a,b) => b.createdAt - a.createdAt);

  return list;
}

// ===== RENDER =====
function render() {
  const list = getFiltered();
  const container = $('taskList');

  if (!list.length) {
    const isNewUser = tasks.length === 0;
    const isViewingToday = activeSessionKey === todayKey();
    let icon, title, sub, showCta = false;

    if (activeFilter === 'all') {
      if (isNewUser) {
        icon = '🌱'; title = 'Fresh start!';
        sub = 'No tasks yet. Add your first task to get going.';
      } else if (!isViewingToday) {
        icon = '📋'; title = 'This day is empty';
        sub = 'No tasks were added on this day.';
      } else {
        icon = '📋'; title = 'No tasks yet';
        sub = 'Add a task to get started with today!';
      }
      showCta = isViewingToday; // Only show CTA if on today
    } else {
      const msgs = {
        active: ['✨','All clear!','No active tasks remaining.'],
        completed: ['🏆','Nothing here','Complete a task to see it here.'],
        overdue: ['🎯','You\'re on track!','No overdue tasks. Keep it up!']
      };
      [icon, title, sub] = msgs[activeFilter] || ['📋','Nothing here',''];
    }

    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${icon}</span>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
        ${showCta ? '<button class="empty-cta" onclick="openModal()">+ Add a task</button>' : ''}
      </div>`;
    return;
  }

  container.innerHTML = '';
  list.forEach((task, idx) => {
    const over = isOverdue(task);
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority||'medium'}${task.completed?' completed':''}`;
    card.setAttribute('role','listitem');
    card.style.animationDelay = `${idx*0.045}s`;

    card.innerHTML = `
      <div class="task-top">
        <div class="task-check-wrap">
          <div class="task-checkbox${task.completed?' checked':''}" data-id="${task.id}" role="checkbox" aria-checked="${task.completed}" tabindex="0" title="Toggle complete">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        </div>
        <div class="task-body">
          <div class="task-title">${escHtml(task.title)}</div>
          <div class="task-meta">
            <span class="tag-pill tag-priority-${task.priority||'medium'}">${task.priority||'medium'}</span>
            ${task.category ? `<span class="task-category-tag">${escHtml(task.category)}</span>` : ''}
            ${task.deadline ? `<span class="task-deadline${over?' overdue':''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              ${over && !task.completed ? '⚠ ' : ''}${formatDate(task.deadline)}
            </span>` : ''}
          </div>
          ${task.notes ? `<div class="task-notes">${escHtml(task.notes)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit" data-id="${task.id}" title="Edit task" aria-label="Edit task">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn delete" data-id="${task.id}" title="Delete task" aria-label="Delete task">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>`;

    container.appendChild(card);
  });

  container.querySelectorAll('.task-checkbox').forEach(el => {
    el.addEventListener('click', e => toggleTask(e.currentTarget.dataset.id, e));
    el.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter') toggleTask(e.currentTarget.dataset.id, e); });
  });
  container.querySelectorAll('.task-action-btn.edit').forEach(el => el.addEventListener('click', () => openEdit(el.dataset.id)));
  container.querySelectorAll('.task-action-btn.delete').forEach(el => el.addEventListener('click', () => deleteTask(el.dataset.id)));
}

// ===== TOGGLE =====
function toggleTask(id, e) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  save(); updateStats(); render(); updateFABVisibility();
  if (task.completed) {
    toast(`"${task.title.slice(0,28)}" done!`, '✅');
    if (e) confetti(e.clientX, e.clientY);
  }
}

// ===== DELETE TASK =====
function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`)?.closest('.task-card');
  if (card) card.classList.add('removing');
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    save(); updateStats(); render(); renderSessionsPanel(); updateFABVisibility();
    toast('Task deleted', '🗑');
  }, 340);
}

// ===== DELETE SESSION =====
function deleteSession(dateKey) {
  const sessionTasks = tasks.filter(t => t.sessionKey === dateKey);
  const confirmed = sessionTasks.length === 0
    || confirm(`Delete this day and its ${sessionTasks.length} task${sessionTasks.length !== 1 ? 's' : ''}?`);
  if (!confirmed) return;

  tasks = tasks.filter(t => t.sessionKey !== dateKey);
  sessions = sessions.filter(s => s.dateKey !== dateKey);

  // After deletion, switch to most recent remaining session or create today
  const remaining = [...sessions].sort((a,b) => b.dateKey.localeCompare(a.dateKey));
  if (remaining.length > 0) {
    activeSessionKey = remaining[0].dateKey;
  } else {
    // No sessions left — create today
    activeSessionKey = todayKey();
    sessions.push({ dateKey: activeSessionKey });
  }

  save(); updateStats(); renderSessionsPanel(); renderTasksHeading(); updateFABVisibility(); render();
  toast('Day deleted', '🗑');
}

// ===== MODAL =====
function openModal(mode = 'add', taskData = null) {
  // Guard: only allow adding tasks to today's session
  if (mode === 'add' && activeSessionKey !== todayKey()) return;

  editId = mode === 'edit' ? taskData.id : null;
  $('modalTitle').textContent = mode === 'edit' ? 'Edit Task' : 'New Task';
  $('submitBtn').textContent = mode === 'edit' ? 'Save Changes' : 'Add Task';
  $('inputTitle').value = taskData?.title || '';
  $('inputNotes').value = taskData?.notes || '';
  $('inputDeadline').value = taskData?.deadline || '';
  $('inputCategory').value = taskData?.category || '';
  document.querySelectorAll('.priority-option').forEach(el => {
    el.checked = el.value === (taskData?.priority || 'medium');
  });
  $('modalOverlay').classList.add('open');
  $('fabBtn').classList.add('open');
  setTimeout(() => $('inputTitle').focus(), 420);
}

function closeModal() {
  $('modalOverlay').classList.remove('open');
  $('fabBtn').classList.remove('open');
  $('taskForm').reset();
  editId = null;
}

function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openModal('edit', task);
}

// ===== SUBMIT =====
$('taskForm').addEventListener('submit', () => {
  const title = $('inputTitle').value.trim();
  if (!title) { $('inputTitle').focus(); return; }

  const priority = document.querySelector('.priority-option:checked')?.value || 'medium';
  const data = {
    title,
    notes: $('inputNotes').value.trim(),
    deadline: $('inputDeadline').value,
    category: $('inputCategory').value,
    priority,
  };

  if (editId) {
    const idx = tasks.findIndex(t => t.id === editId);
    if (idx > -1) tasks[idx] = { ...tasks[idx], ...data };
    toast('Task updated', '✏️');
  } else {
    const sessionKey = activeSessionKey || todayKey();
    tasks.unshift({ id: uid(), createdAt: Date.now(), completed: false, sessionKey, ...data });
    if (!sessions.find(s => s.dateKey === sessionKey)) {
      sessions.push({ dateKey: sessionKey });
    }
    toast('Task added!', '🚀');
  }

  save(); updateStats(); render(); renderSessionsPanel(); renderTasksHeading(); updateFABVisibility(); closeModal();
});

// ===== EVENTS =====
$('fabBtn').addEventListener('click', () => openModal());
$('cancelBtn').addEventListener('click', closeModal);
$('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
  });
});

$('sortSelect').addEventListener('change', () => { activeSort = $('sortSelect').value; render(); });
$('searchInput').addEventListener('input', () => { searchQuery = $('searchInput').value; render(); });

$('clearCompleted').addEventListener('click', () => {
  const count = tasks.filter(t => t.completed && (activeSessionKey ? t.sessionKey === activeSessionKey : true)).length;
  if (activeSessionKey) {
    tasks = tasks.filter(t => !(t.completed && t.sessionKey === activeSessionKey));
  } else {
    tasks = tasks.filter(t => !t.completed);
  }
  save(); updateStats(); render(); renderSessionsPanel(); updateFABVisibility();
  toast(`Cleared ${count} completed task${count===1?'':'s'}`, '🧹');
});

$('btnNewSession').addEventListener('click', startNewSession);

document.addEventListener('keydown', e => {
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && e.target === document.body) openModal();
  if (e.key === 'Escape') closeModal();
});

// ===== THEME =====
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('themeIcon').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, t);
}
$('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  setTheme(cur === 'dark' ? 'light' : 'dark');
});
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
setTheme(savedTheme);

// ===== INIT =====
updateDate();

const isNewUser = tasks.length === 0 && sessions.length === 0;
if (isNewUser) {
  activeSessionKey = todayKey();
  sessions.push({ dateKey: activeSessionKey });
  save();
} else {
  activeSessionKey = ensureTodaySession();
}

renderSessionsPanel();
renderTasksHeading();
updateFABVisibility(); // FIX: set FAB visibility on init
updateStats();
render();

// ===== BACKGROUND CANVAS =====
(function() {
  const canvas = $('bgCanvas');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function rand(a,b) { return a + Math.random()*(b-a); }
  const dots = Array.from({length: 28}, () => ({
    x: rand(0, canvas.width), y: rand(0, canvas.height),
    r: rand(3, 7), speedY: rand(-0.18, -0.06), speedX: rand(-0.06, 0.06),
    pulse: rand(0, Math.PI*2), pulseSpeed: rand(0.008, 0.018), baseAlpha: rand(0.35, 0.55),
  }));
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = isDark() ? 'rgba(245,158,11,' : 'rgba(217,119,6,';
    const blue   = isDark() ? 'rgba(56,189,248,' : 'rgba(2,132,199,';
    const green  = isDark() ? 'rgba(52,211,153,' : 'rgba(5,150,105,';
    const cols = [accent, blue, green, accent, accent];
    dots.forEach((d, i) => {
      d.x += d.speedX; d.y += d.speedY; d.pulse += d.pulseSpeed;
      if (d.y < -10) { d.y = canvas.height + 10; d.x = rand(0, canvas.width); }
      if (d.x < -10) d.x = canvas.width + 10;
      if (d.x > canvas.width+10) d.x = -10;
      const alpha = d.baseAlpha * (0.6 + 0.4 * Math.sin(d.pulse));
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fillStyle = cols[i % cols.length] + alpha + ')'; ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// ===== LANDING CANVAS =====
(function() {
  const canvas = $('landingCanvas');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function rand(a,b) { return a + Math.random()*(b-a); }
  const LIGHT_COLS = ['#f472b6','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc'];
  const DARK_COLS  = ['#f9a8d4','#fbbf24','#86efac','#93c5fd','#d8b4fe','#fdba74'];
  const TYPES = ['dot','ring','cross','star'];
  const shapes = Array.from({length: 22}, () => ({
    type: TYPES[Math.floor(Math.random()*TYPES.length)],
    x: rand(0, window.innerWidth), y: rand(0, window.innerHeight),
    size: rand(4, 9), speedY: rand(-0.22, -0.08), speedX: rand(-0.08, 0.08),
    rot: rand(0, Math.PI*2), rotSpeed: rand(-0.006, 0.006),
    pulse: rand(0, Math.PI*2), pulseSpeed: rand(0.01, 0.022),
    alpha: rand(0.18, 0.38), colIdx: Math.floor(Math.random()*6),
  }));
  function drawShape(s, col) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (s.type === 'dot') { ctx.beginPath(); ctx.arc(0,0,s.size,0,Math.PI*2); ctx.fill(); }
    else if (s.type === 'ring') { ctx.beginPath(); ctx.arc(0,0,s.size,0,Math.PI*2); ctx.stroke(); }
    else if (s.type === 'cross') { ctx.beginPath(); ctx.moveTo(-s.size,0); ctx.lineTo(s.size,0); ctx.moveTo(0,-s.size); ctx.lineTo(0,s.size); ctx.stroke(); }
    else if (s.type === 'star') {
      ctx.beginPath();
      for (let i=0;i<10;i++) {
        const r = i%2===0 ? s.size : s.size*0.42;
        const a = (i*Math.PI)/5 - Math.PI/2;
        i===0 ? ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cols = isDark() ? DARK_COLS : LIGHT_COLS;
    shapes.forEach(s => {
      s.x += s.speedX; s.y += s.speedY; s.rot += s.rotSpeed; s.pulse += s.pulseSpeed;
      if (s.y < -20) { s.y = canvas.height+20; s.x = rand(0,canvas.width); }
      if (s.x < -20) s.x = canvas.width+20; if (s.x > canvas.width+20) s.x = -20;
      const alpha = s.alpha * (0.7 + 0.3*Math.sin(s.pulse));
      ctx.globalAlpha = alpha; drawShape(s, cols[s.colIdx]); ctx.globalAlpha = 1;
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// ===== CLICK BURST ANIMATION =====
(function() {
  const rippleLayer = document.createElement('canvas');
  rippleLayer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(rippleLayer);
  const ctx = rippleLayer.getContext('2d');
  function resize() { rippleLayer.width = window.innerWidth; rippleLayer.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  const particles = [];

  function triggerBurst(x, y) {
    const accent = isDark() ? '#f59e0b' : '#d97706';
    const cols = isDark()
      ? ['#f59e0b','#38bdf8','#34d399','#f472b6','#c084fc','#fb923c']
      : ['#d97706','#0284c7','#059669','#f472b6','#7c3aed','#e11d48'];
    particles.push({ type:'ring', x, y, r:1, alpha:0.6, color:accent, decay:0.022, speed:3.5 });
    setTimeout(() => { particles.push({ type:'ring', x, y, r:1, alpha:0.3, color:accent, decay:0.016, speed:2.2 }); }, 70);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 1.6 + Math.random() * 2.4;
      particles.push({ type:'dot', x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-0.5, r:2+Math.random()*2, alpha:0.85, decay:0.03, color:cols[i%cols.length] });
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .btn-ripple-host { position: relative; overflow: hidden; }
    @keyframes btnRippleAnim { 0%{transform:scale(0);opacity:0.5} 100%{transform:scale(4.5);opacity:0} }
    .btn-ripple-circle { position:absolute;border-radius:50%;width:80px;height:80px;margin-top:-40px;margin-left:-40px;background:rgba(255,255,255,0.5);pointer-events:none;animation:btnRippleAnim 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
    .btn-ripple-circle.accent-ripple { background:rgba(217,119,6,0.28); }
  `;
  document.head.appendChild(style);

  const RIPPLE_SELECTORS = ['.filter-tab','.btn-icon','.fab','.btn','.task-action-btn','.session-card','.btn-new-session','.empty-cta','.clear-btn','.task-checkbox','.session-del-btn'];
  function addRippleHost(el) { if (!el.classList.contains('btn-ripple-host')) el.classList.add('btn-ripple-host'); }
  function initRippleHosts() { RIPPLE_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(addRippleHost)); }
  initRippleHosts();

  function triggerCSSRipple(el, e) {
    const rect = el.getBoundingClientRect();
    const circle = document.createElement('span');
    circle.className = 'btn-ripple-circle';
    const bg = window.getComputedStyle(el).backgroundColor;
    if (!bg.includes('217,119') && !bg.includes('245,158') && !bg.includes('220,38')) circle.classList.add('accent-ripple');
    circle.style.top = (e.clientY - rect.top) + 'px';
    circle.style.left = (e.clientX - rect.left) + 'px';
    el.appendChild(circle);
    setTimeout(() => circle.remove(), 560);
  }

  document.addEventListener('click', e => {
    const host = e.target.closest('.btn-ripple-host');
    if (host) { triggerBurst(e.clientX, e.clientY); triggerCSSRipple(host, e); initRippleHosts(); }
    else {
      const inCard = e.target.closest('.task-card,.stat-card,.progress-card,.modal,#landing');
      if (!inCard) triggerBurst(e.clientX, e.clientY);
    }
  });

  function tick() {
    ctx.clearRect(0, 0, rippleLayer.width, rippleLayer.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.alpha -= p.decay;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      if (p.type === 'ring') {
        p.r += p.speed; p.speed *= 0.95;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.8; ctx.globalAlpha = p.alpha; ctx.stroke(); ctx.globalAlpha = 1;
      } else if (p.type === 'dot') {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.97;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

runLanding();