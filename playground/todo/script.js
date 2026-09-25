const $ = id => document.getElementById(id);

function load() {
  try { return JSON.parse(localStorage.getItem('todo-state')) || null; } catch { return null; }
}
const state = load() || { tasks: [], filter: 'all' };
function save() {
  try { localStorage.setItem('todo-state', JSON.stringify(state)); } catch {}
}

function visibleTasks() {
  if (state.filter === 'active') return state.tasks.filter(t => !t.done);
  if (state.filter === 'done') return state.tasks.filter(t => t.done);
  return state.tasks;
}

function render() {
  const list = $('list');
  list.innerHTML = '';
  const tasks = visibleTasks();
  if (!tasks.length) list.innerHTML = '<li class="empty">할 일이 없어요</li>';
  for (const t of tasks) {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = t.done;
    box.onchange = () => { t.done = box.checked; save(); render(); };

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = t.text;

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.onclick = () => {
      state.tasks = state.tasks.filter(x => x !== t);
      save(); render();
    };

    li.append(box, text, del);
    list.append(li);
  }

  for (const btn of document.querySelectorAll('.filter')) {
    btn.classList.toggle('active', btn.dataset.filter === state.filter);
  }

  const remaining = state.tasks.filter(t => !t.done).length;
  $('stats').textContent = `${remaining}개 남음`;
}

$('add').onsubmit = e => {
  e.preventDefault();
  const input = $('newTask');
  const text = input.value.trim();
  if (!text) return;
  state.tasks.push({ id: Date.now(), text, done: false });
  input.value = '';
  save(); render();
};

$('filters').onclick = e => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  save(); render();
};

$('clearDone').onclick = () => {
  state.tasks = state.tasks.filter(t => !t.done);
  save(); render();
};

render();
