function renderList() {
  const list = $('list');
  list.innerHTML = '';
  if (!state.tasks.length) list.innerHTML = '<li class="empty">아직 할 일이 없어요</li>';
  for (const t of state.tasks) {
    const li = document.createElement('li');
    li.className = (t.id === state.activeId ? 'active ' : '') + (t.done ? 'done' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = t.done;
    box.onclick = e => { e.stopPropagation(); t.done = box.checked; save(); renderList(); };
    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = t.text;
    const tom = document.createElement('span');
    tom.className = 'tomatoes';
    tom.textContent = '🍅'.repeat(t.pomodoros);
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.onclick = e => {
      e.stopPropagation();
      state.tasks = state.tasks.filter(x => x !== t);
      if (state.activeId === t.id) state.activeId = null;
      save(); renderList(); renderTimer();
    };
    li.onclick = () => {
      state.activeId = state.activeId === t.id ? null : t.id;
      save(); renderList(); renderTimer();
    };
    li.append(box, text, tom, del);
    list.append(li);
  }
  const done = state.tasks.filter(t => t.done).length;
  $('stats').textContent = `완료 ${done}/${state.tasks.length} · 🍅 ${state.sessions}`;
}

$('add').onsubmit = e => {
  e.preventDefault();
  const text = $('newTask').value.trim();
  if (!text) return;
  const task = { id: Date.now(), text, done: false, pomodoros: 0 };
  state.tasks.push(task);
  if (!state.activeId) state.activeId = task.id;
  $('newTask').value = '';
  save(); renderList(); renderTimer();
};
