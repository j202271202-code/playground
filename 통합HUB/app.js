// ============================================================
// 통합HUB - 할일 관리 도구
// 데이터는 브라우저 localStorage에 저장됩니다 (이 PC, 이 브라우저 전용)
// ============================================================

const STORAGE_KEY = "hub_todos_v1";

/** @typedef {{id:string, date:string, text:string, done:boolean, priority:'high'|'mid'|'low', createdAt:number}} Todo */

// ---------- 날짜 유틸 ----------
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const todayKey = toDateKey(new Date());

// ---------- 데이터 저장/불러오기 ----------
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("할 일 데이터를 불러오지 못했습니다.", e);
    return [];
  }
}
function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn("할 일 데이터를 저장하지 못했습니다.", e);
  }
}

let todos = loadTodos();
let selectedDateKey = todayKey; // 월별 뷰에서 선택된 날짜
let calendarCursor = new Date(); // 월별 뷰가 보고 있는 "달"

// ---------- 공통 렌더 유틸 ----------
function priorityLabel(p) {
  return { high: "높음", mid: "보통", low: "낮음" }[p] || "보통";
}

function renderTodoList(listEl, emptyEl, dateKey) {
  const items = todos
    .filter((t) => t.date === dateKey)
    .sort((a, b) => a.createdAt - b.createdAt);

  listEl.innerHTML = "";
  emptyEl.hidden = items.length > 0;

  for (const t of items) {
    const li = document.createElement("li");
    li.className = "todo-item" + (t.done ? " is-done" : "");

    const dot = document.createElement("span");
    dot.className = `priority-dot priority-dot--${t.priority}`;
    dot.title = `우선순위: ${priorityLabel(t.priority)}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => {
      t.done = checkbox.checked;
      saveTodos(todos);
      renderAll();
    });

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = t.text;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      todos = todos.filter((x) => x.id !== t.id);
      saveTodos(todos);
      renderAll();
    });

    li.append(dot, checkbox, text, delBtn);
    listEl.appendChild(li);
  }
}

function addTodo(dateKey, text, priority) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.push({
    id: crypto.randomUUID(),
    date: dateKey,
    text: trimmed,
    done: false,
    priority,
    createdAt: Date.now(),
  });
  saveTodos(todos);
}

// ---------- 상단 통계 ----------
function renderStats() {
  const todayTodos = todos.filter((t) => t.date === todayKey);
  const doneCount = todayTodos.filter((t) => t.done).length;
  const total = todayTodos.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statDone").textContent = doneCount;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressPct").textContent = pct + "%";

  // 이번 달 완료율
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const monthTodos = todos.filter((t) => {
    const d = parseDateKey(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const monthDone = monthTodos.filter((t) => t.done).length;
  const monthPct = monthTodos.length === 0 ? 0 : Math.round((monthDone / monthTodos.length) * 100);
  document.getElementById("statMonth").textContent = monthPct + "%";
}

// ---------- 일별 뷰 ----------
function renderDailyView() {
  document.getElementById("dailyPanelTitle").textContent =
    todayKey === selectedDateKey ? "오늘의 할 일" : `${todayKey} 할 일`;
  renderTodoList(
    document.getElementById("dailyList"),
    document.getElementById("dailyEmpty"),
    todayKey
  );
}

// ---------- 월별 뷰 (캘린더) ----------
function renderCalendar() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  document.getElementById("calendarTitle").textContent = `${y}년 ${m + 1}월`;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstOfMonth = new Date(y, m, 1);
  const startOffset = firstOfMonth.getDay(); // 0=일요일
  const gridStart = new Date(y, m, 1 - startOffset);

  // 6주 x 7일 = 42칸으로 고정 (레이아웃 흔들림 방지)
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = toDateKey(cellDate);
    const isOutside = cellDate.getMonth() !== m;
    const isToday = key === todayKey;
    const isSelected = key === selectedDateKey;

    const dayTodos = todos.filter((t) => t.date === key);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className =
      "calendar-day" +
      (isOutside ? " is-outside" : "") +
      (isToday ? " is-today" : "") +
      (isSelected ? " is-selected" : "");
    cell.dataset.date = key;

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = cellDate.getDate();

    const bottomRow = document.createElement("div");
    bottomRow.className = "day-dots";
    const shown = dayTodos.slice(0, 4);
    for (const t of shown) {
      const dot = document.createElement("span");
      dot.style.background = `var(--priority-${t.priority})`;
      bottomRow.appendChild(dot);
    }
    if (dayTodos.length > 0) {
      const countEl = document.createElement("div");
      countEl.className = "day-count";
      countEl.textContent = dayTodos.filter((t) => t.done).length + "/" + dayTodos.length;
      cell.append(numEl, bottomRow, countEl);
    } else {
      cell.append(numEl, bottomRow);
    }

    cell.addEventListener("click", () => {
      selectedDateKey = key;
      renderMonthlyView();
    });

    grid.appendChild(cell);
  }
}

function renderSelectedDayPanel() {
  const d = parseDateKey(selectedDateKey);
  const label = `${d.getMonth() + 1}월 ${d.getDate()}일` + (selectedDateKey === todayKey ? " (오늘)" : "");
  document.getElementById("selectedDayTitle").textContent = label;
  renderTodoList(
    document.getElementById("monthlyList"),
    document.getElementById("monthlyEmpty"),
    selectedDateKey
  );
}

function renderMonthlyView() {
  renderCalendar();
  renderSelectedDayPanel();
}

// ---------- 전체 렌더 ----------
function renderAll() {
  renderStats();
  renderDailyView();
  renderMonthlyView();
}

// ---------- 초기 인사 / 날짜 표시 ----------
function renderHeader() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "좋은 아침이에요 ☀️" : hour < 18 ? "오늘도 힘내세요 💪" : "오늘 하루도 고생했어요 🌙";
  document.getElementById("greeting").textContent = greet;

  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday})`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

// ---------- 뷰 전환 (일별 / 월별) ----------
function setActiveView(view) {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.getElementById("view-daily").classList.toggle("is-active", view === "daily");
  document.getElementById("view-monthly").classList.toggle("is-active", view === "monthly");
}

// ---------- 이벤트 바인딩 ----------
function bindEvents() {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  document.getElementById("dailyAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("dailyInput");
    const priority = document.getElementById("dailyPriority").value;
    addTodo(todayKey, input.value, priority);
    input.value = "";
    renderAll();
    input.focus();
  });

  document.getElementById("monthlyAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("monthlyInput");
    const priority = document.getElementById("monthlyPriority").value;
    addTodo(selectedDateKey, input.value, priority);
    input.value = "";
    renderAll();
    input.focus();
  });

  document.getElementById("prevMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderMonthlyView();
    renderStats();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderMonthlyView();
    renderStats();
  });
}

// ---------- 시작 ----------
renderHeader();
bindEvents();
renderAll();
