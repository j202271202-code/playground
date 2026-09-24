const MODES = {
  focus: { label: '집중', minutes: 25, color: 'var(--focus)' },
  break: { label: '휴식', minutes: 5, color: 'var(--break)' },
};
const CIRC = 2 * Math.PI * 100;

let mode = 'focus';
let remaining = MODES.focus.minutes * 60;
let endAt = null;   // timestamp when the running timer ends
let tick = null;

$('progress').style.strokeDasharray = CIRC;

function renderTimer() {
  const m = MODES[mode];
  document.documentElement.style.setProperty('--mode', m.color);
  const secs = Math.max(0, Math.ceil(remaining));
  const text = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  $('clock').textContent = text;
  $('mode').textContent = m.label;
  $('toggle').textContent = endAt ? '일시정지' : '시작';
  $('progress').style.strokeDashoffset = CIRC * (1 - remaining / (m.minutes * 60));
  document.title = endAt ? `${text} · ${m.label}` : '포커스 타이머';
  const active = state.tasks.find(t => t.id === state.activeId);
  $('current').textContent = active ? `지금: ${active.text}` : '할 일을 클릭하면 이 타이머와 연결돼요';
}

function switchMode(next) {
  mode = next;
  remaining = MODES[mode].minutes * 60;
  endAt = null;
  clearInterval(tick);
  renderTimer();
}

function finish() {
  chime();
  if (mode === 'focus') {
    state.sessions++;
    const active = state.tasks.find(t => t.id === state.activeId);
    if (active) active.pomodoros++;
    save();
    renderList();
  }
  switchMode(mode === 'focus' ? 'break' : 'focus');
}

$('toggle').onclick = () => {
  if (endAt) {
    remaining = (endAt - Date.now()) / 1000;
    endAt = null;
    clearInterval(tick);
  } else {
    endAt = Date.now() + remaining * 1000;
    tick = setInterval(() => {
      remaining = (endAt - Date.now()) / 1000;
      if (remaining <= 0) finish(); else renderTimer();
    }, 250);
  }
  renderTimer();
};
$('reset').onclick = () => switchMode(mode);
$('skip').onclick = () => switchMode(mode === 'focus' ? 'break' : 'focus');
