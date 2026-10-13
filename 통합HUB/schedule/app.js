// ============================================================
// 통합HUB - 일정관리
// 데이터는 브라우저 localStorage에 저장됩니다 (이 PC, 이 브라우저 전용)
// ============================================================

const STORAGE_KEY = "hub_schedule_v1";

const CATEGORY_META = {
  work: { label: "업무", color: "var(--cat-work)" },
  personal: { label: "개인", color: "var(--cat-personal)" },
  appointment: { label: "약속", color: "var(--cat-appointment)" },
  health: { label: "건강", color: "var(--cat-health)" },
  etc: { label: "기타", color: "var(--cat-etc)" },
};

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
function dayDiff(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aa - bb) / ms);
}
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const todayKey = toDateKey(new Date());
const today = new Date();

// ---------- 데이터 저장/불러오기 ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw);
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch (e) {
    console.warn("일정 데이터를 불러오지 못했습니다.", e);
    return { events: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("일정 데이터를 저장하지 못했습니다.", e);
  }
}

let data = loadData();

// ---------- 상태 ----------
let selectedDailyDate = new Date();
let calendarCursor = new Date();
let yearCursor = new Date().getFullYear();

// ---------- 시간 선택 드롭다운 (30분 단위) ----------
function timeOptionsHTML() {
  let html = "";
  for (let h = 0; h < 24; h++) {
    for (const mm of [0, 30]) {
      const label = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      html += `<option value="${label}">${label}</option>`;
    }
  }
  return html;
}
function nearestHalfHour(date) {
  const h = date.getHours();
  const roundedMin = date.getMinutes() < 30 ? 30 : 0;
  const roundedHour = date.getMinutes() < 30 ? h : (h + 1) % 24;
  return `${String(roundedHour).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
}
function setupTimeSelects() {
  const startSel = document.getElementById("eventStart");
  const endSel = document.getElementById("eventEnd");
  startSel.innerHTML = timeOptionsHTML();
  endSel.innerHTML = `<option value="">종료 없음</option>` + timeOptionsHTML();
  resetTimeSelectsToDefault();
}
function resetTimeSelectsToDefault() {
  document.getElementById("eventStart").value = nearestHalfHour(new Date());
  document.getElementById("eventEnd").value = "";
}

// ============================================================
// 조회 helper
// ============================================================
function eventsOn(dateKey) {
  return data.events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}
function eventsInMonth(y, m) {
  return data.events.filter((e) => {
    const d = parseDateKey(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
function eventsInYear(y) {
  return data.events.filter((e) => parseDateKey(e.date).getFullYear() === y);
}
function eventsInWeekOf(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return data.events.filter((e) => e.date >= startKey && e.date <= endKey);
}
function detectConflicts(dateKey) {
  const timed = eventsOn(dateKey).filter((e) => e.start && e.end);
  const conflicts = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      const aS = timeToMinutes(a.start), aE = timeToMinutes(a.end);
      const bS = timeToMinutes(b.start), bE = timeToMinutes(b.end);
      if (aS < bE && bS < aE) conflicts.push([a, b]);
    }
  }
  return conflicts;
}

// ============================================================
// 헤더 / 통계 타일
// ============================================================
function renderHeader() {
  const now = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) 일정을 확인해보세요`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

function renderStatTiles() {
  const now = new Date();
  document.getElementById("statToday").textContent = eventsOn(todayKey).length + " 건";
  document.getElementById("statWeek").textContent = eventsInWeekOf(now).length + " 건";
  document.getElementById("statMonth").textContent = eventsInMonth(now.getFullYear(), now.getMonth()).length + " 건";

  const upcoming = data.events
    .filter((e) => e.date > todayKey || (e.date === todayKey && timeToMinutes(e.start) >= now.getHours() * 60 + now.getMinutes()))
    .sort((a, b) => (a.date === b.date ? timeToMinutes(a.start) - timeToMinutes(b.start) : a.date < b.date ? -1 : 1))[0];
  const nextEl = document.getElementById("statNextEvent");
  const nextMetaEl = document.getElementById("statNextEventMeta");
  if (upcoming) {
    nextEl.textContent = upcoming.title;
    nextMetaEl.textContent = `${upcoming.date} ${upcoming.start} · ${CATEGORY_META[upcoming.category].label}`;
  } else {
    nextEl.textContent = "-";
    nextMetaEl.textContent = "예정된 일정이 없어요";
  }
}

// ============================================================
// 일별 뷰
// ============================================================
function renderConflictWarning(dateKey) {
  const warnEl = document.getElementById("conflictWarning");
  const conflicts = detectConflicts(dateKey);
  if (conflicts.length === 0) {
    warnEl.hidden = true;
    return;
  }
  const names = conflicts.map(([a, b]) => `${a.title} ↔ ${b.title}`).join(", ");
  warnEl.hidden = false;
  warnEl.textContent = `⚠️ 시간이 겹치는 일정이 있어요: ${names}`;
}

function renderTimeline(dateKey, events) {
  const timelineEl = document.getElementById("timeline");
  timelineEl.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    const hourEl = document.createElement("div");
    hourEl.className = "timeline-hour";
    hourEl.style.top = h * 40 + "px";
    hourEl.textContent = String(h).padStart(2, "0") + ":00";
    timelineEl.appendChild(hourEl);
  }

  if (dateKey === todayKey) {
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const nowLine = document.createElement("div");
    nowLine.className = "timeline-now-line";
    nowLine.style.top = (nowMin / 1440) * 960 + "px";
    timelineEl.appendChild(nowLine);
  }

  for (const ev of events) {
    const cat = CATEGORY_META[ev.category];
    const startMin = timeToMinutes(ev.start);
    if (ev.end) {
      const endMin = Math.max(timeToMinutes(ev.end), startMin + 15);
      const block = document.createElement("div");
      block.className = "timeline-event";
      block.style.top = (startMin / 1440) * 960 + "px";
      block.style.height = Math.max(((endMin - startMin) / 1440) * 960, 20) + "px";
      block.style.background = cat.color;
      block.innerHTML = `<span class="te-time">${ev.start}~${ev.end}</span>${ev.title}`;
      block.title = `${ev.title} (${ev.start}~${ev.end})`;
      timelineEl.appendChild(block);
    } else {
      const dot = document.createElement("div");
      dot.className = "timeline-event is-point";
      dot.style.top = (startMin / 1440) * 960 - 3 + "px";
      dot.style.background = cat.color;
      dot.title = `${ev.title} (${ev.start})`;
      timelineEl.appendChild(dot);
    }
  }
}

function renderEventList(dateKey, events) {
  const listEl = document.getElementById("eventList");
  const emptyEl = document.getElementById("eventEmpty");
  listEl.innerHTML = "";
  emptyEl.hidden = events.length > 0;

  for (const ev of events) {
    const cat = CATEGORY_META[ev.category];
    const li = document.createElement("li");
    li.className = "event-item";

    const timeBadge = document.createElement("div");
    timeBadge.className = "event-time-badge";
    timeBadge.textContent = ev.start + (ev.end ? "~" + ev.end : "");

    const main = document.createElement("div");
    main.className = "event-main";
    const titleEl = document.createElement("span");
    titleEl.className = "event-title";
    titleEl.textContent = ev.title;
    main.appendChild(titleEl);
    if (ev.memo) {
      const memoEl = document.createElement("span");
      memoEl.className = "event-memo";
      memoEl.textContent = "· " + ev.memo;
      main.appendChild(memoEl);
    }

    const tag = document.createElement("span");
    tag.className = "event-cat-tag";
    tag.style.background = cat.color;
    tag.textContent = cat.label;

    const delBtn = document.createElement("button");
    delBtn.className = "event-delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      data.events = data.events.filter((x) => x.id !== ev.id);
      saveData();
      renderAll();
    });

    li.append(timeBadge, main, tag, delBtn);
    listEl.appendChild(li);
  }
}

function renderDailyView() {
  const dateKey = toDateKey(selectedDailyDate);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][selectedDailyDate.getDay()];
  document.getElementById("dailyTitle").textContent =
    dateKey === todayKey
      ? "오늘"
      : `${selectedDailyDate.getMonth() + 1}월 ${selectedDailyDate.getDate()}일 (${weekday})`;

  const events = eventsOn(dateKey);
  renderConflictWarning(dateKey);
  renderTimeline(dateKey, events);
  renderEventList(dateKey, events);
}

// ============================================================
// 차트 공통 유틸 (SVG, 외부 라이브러리 없음)
// ============================================================
function makeTooltip(container) {
  const tip = document.createElement("div");
  tip.className = "chart-tooltip";
  container.appendChild(tip);
  return {
    show(evt, text) {
      const rect = container.getBoundingClientRect();
      tip.textContent = text;
      tip.style.left = evt.clientX - rect.left + "px";
      tip.style.top = evt.clientY - rect.top + "px";
      tip.classList.add("is-visible");
    },
    hide() {
      tip.classList.remove("is-visible");
    },
  };
}

function renderBarChart(container, items, opts = {}) {
  container.innerHTML = "";
  if (items.length === 0 || items.every((i) => i.value === 0)) {
    container.innerHTML = '<p class="chart-empty-note">아직 기록이 없어요.</p>';
    return;
  }
  const W = 640, H = 220;
  const padL = 36, padR = 10, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = Math.max(...items.map((i) => i.value), 1) * 1.15;

  const n = items.length;
  const gap = n > 20 ? 1 : 10;
  const barW = Math.max((plotW - gap * (n - 1)) / n, 2);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  for (let i = 0; i <= 2; i++) {
    const y = padT + (plotH * i) / 2;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", padL);
    line.setAttribute("x2", W - padR);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-gridline");
    svg.appendChild(line);

    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", padL - 6);
    label.setAttribute("y", y + 3);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-axis-label");
    const val = maxVal * (1 - i / 2);
    label.textContent = Math.round(val);
    svg.appendChild(label);
  }

  const tooltip = makeTooltip(container);
  const labelEvery = n > 24 ? 5 : n > 12 ? 2 : 1;

  items.forEach((item, idx) => {
    const barH = (item.value / maxVal) * plotH;
    const x = padL + idx * (barW + gap);
    const y = padT + plotH - barH;

    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barW);
    rect.setAttribute("height", Math.max(barH, item.value > 0 ? 2 : 0));
    rect.setAttribute("rx", 3);
    rect.setAttribute("class", "chart-bar");
    if (item.color) rect.style.fill = item.color;
    rect.addEventListener("mousemove", (e) =>
      tooltip.show(e, `${item.label}: ${opts.formatValue ? opts.formatValue(item.value) : item.value}`)
    );
    rect.addEventListener("mouseleave", () => tooltip.hide());
    svg.appendChild(rect);

    const xLabel = document.createElementNS(svg.namespaceURI, "text");
    xLabel.setAttribute("x", x + barW / 2);
    xLabel.setAttribute("y", H - 8);
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.setAttribute("class", "chart-axis-label");
    if (idx % labelEvery === 0) xLabel.textContent = item.label;
    svg.appendChild(xLabel);
  });

  container.appendChild(svg);
}

// ============================================================
// 월별 뷰
// ============================================================
function renderCalendar() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  document.getElementById("calendarTitle").textContent = `${y}년 ${m + 1}월`;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstOfMonth = new Date(y, m, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(y, m, 1 - startOffset);

  const monthEvents = eventsInMonth(y, m);
  const byDate = {};
  for (const e of monthEvents) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = toDateKey(cellDate);
    const isOutside = cellDate.getMonth() !== m;
    const isToday = key === todayKey;
    const dayEvents = byDate[key] || [];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day" + (isOutside ? " is-outside" : "") + (isToday ? " is-today" : "");

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    if (dayEvents.length > 0) {
      const dots = document.createElement("div");
      dots.className = "day-dots";
      for (const e of dayEvents.slice(0, 4)) {
        const dot = document.createElement("span");
        dot.style.background = CATEGORY_META[e.category].color;
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
      if (dayEvents.length > 4) {
        const more = document.createElement("div");
        more.className = "day-count";
        more.textContent = "+" + (dayEvents.length - 4);
        cell.appendChild(more);
      }
    }

    cell.addEventListener("click", () => {
      selectedDailyDate = cellDate;
      setActiveView("daily");
      renderAll();
    });

    grid.appendChild(cell);
  }
}

function renderCategoryChart() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const monthEvents = eventsInMonth(y, m);

  const items = Object.entries(CATEGORY_META).map(([key, meta]) => ({
    label: meta.label,
    value: monthEvents.filter((e) => e.category === key).length,
    color: meta.color,
  }));
  renderBarChart(document.getElementById("categoryBarChart"), items, {
    formatValue: (v) => v + "건",
  });

  const legendEl = document.getElementById("categoryLegend");
  legendEl.innerHTML = "";
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    const span = document.createElement("span");
    span.className = "cat-legend-item";
    span.innerHTML = `<span class="cat-dot" style="background:${meta.color}"></span>${meta.label}`;
    legendEl.appendChild(span);
  }
}

function renderMonthEventList() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const events = eventsInMonth(y, m).sort((a, b) =>
    a.date === b.date ? timeToMinutes(a.start) - timeToMinutes(b.start) : a.date < b.date ? -1 : 1
  );

  document.getElementById("monthEventListTitle").textContent = `${y}년 ${m + 1}월 일정 전체 (${events.length}건)`;

  const listEl = document.getElementById("monthEventList");
  const emptyEl = document.getElementById("monthEventEmpty");
  listEl.innerHTML = "";
  emptyEl.hidden = events.length > 0;

  for (const ev of events) {
    const cat = CATEGORY_META[ev.category];
    const d = parseDateKey(ev.date);
    const li = document.createElement("li");
    li.className = "event-item";

    const timeBadge = document.createElement("div");
    timeBadge.className = "event-time-badge";
    timeBadge.textContent = `${d.getMonth() + 1}/${d.getDate()} ${ev.start}`;

    const main = document.createElement("div");
    main.className = "event-main";
    const titleEl = document.createElement("span");
    titleEl.className = "event-title";
    titleEl.textContent = ev.title;
    main.appendChild(titleEl);
    if (ev.memo) {
      const memoEl = document.createElement("span");
      memoEl.className = "event-memo";
      memoEl.textContent = "· " + ev.memo;
      main.appendChild(memoEl);
    }

    const tag = document.createElement("span");
    tag.className = "event-cat-tag";
    tag.style.background = cat.color;
    tag.textContent = cat.label;

    const delBtn = document.createElement("button");
    delBtn.className = "event-delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      data.events = data.events.filter((x) => x.id !== ev.id);
      saveData();
      renderAll();
    });

    li.append(timeBadge, main, tag, delBtn);
    listEl.appendChild(li);
  }
}

function renderMonthlyView() {
  renderCalendar();
  renderCategoryChart();
  renderMonthEventList();
}

// ============================================================
// 연간 뷰
// ============================================================
function renderYearlyView() {
  document.getElementById("yearTitle").textContent = `${yearCursor}년`;

  const yearEvents = eventsInYear(yearCursor);
  const monthlyCounts = Array.from({ length: 12 }, (_, m) => ({
    label: `${m + 1}월`,
    value: yearEvents.filter((e) => parseDateKey(e.date).getMonth() === m).length,
  }));
  renderBarChart(document.getElementById("yearBarChart"), monthlyCounts, {
    formatValue: (v) => v + "건",
  });

  const catCount = {};
  for (const e of yearEvents) catCount[e.category] = (catCount[e.category] || 0) + 1;
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  const avgPerMonth = yearEvents.length > 0 ? (yearEvents.length / 12).toFixed(1) : "0";
  const busiestMonth = monthlyCounts.reduce((b, m) => (m.value > b.value ? m : b), monthlyCounts[0]);

  const summaryEl = document.getElementById("yearSummary");
  const items = [
    { label: "총 일정 수", value: yearEvents.length + " 건" },
    { label: "가장 바쁜 달", value: busiestMonth.value > 0 ? `${busiestMonth.label} (${busiestMonth.value}건)` : "-" },
    { label: "가장 많은 카테고리", value: topCat ? CATEGORY_META[topCat[0]].label + ` (${topCat[1]}건)` : "-" },
    { label: "월평균 일정 수", value: avgPerMonth + " 건" },
  ];
  summaryEl.innerHTML = "";
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "year-summary-item";
    div.innerHTML = `<div class="ys-label">${it.label}</div><div class="ys-value">${it.value}</div>`;
    summaryEl.appendChild(div);
  }
}

// ============================================================
// 전체 렌더 / 뷰 전환
// ============================================================
function renderAll() {
  renderStatTiles();
  renderDailyView();
  renderMonthlyView();
  renderYearlyView();
}

function setActiveView(view) {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.getElementById("view-daily").classList.toggle("is-active", view === "daily");
  document.getElementById("view-monthly").classList.toggle("is-active", view === "monthly");
  document.getElementById("view-yearly").classList.toggle("is-active", view === "yearly");
}

// ============================================================
// 이벤트 바인딩
// ============================================================
function bindEvents() {
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  document.getElementById("eventAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const start = document.getElementById("eventStart").value;
    const end = document.getElementById("eventEnd").value;
    const title = document.getElementById("eventTitle").value.trim();
    const category = document.getElementById("eventCategory").value;
    const memo = document.getElementById("eventMemo").value.trim();

    if (!start || !title) {
      alert("시작 시간과 제목을 입력해주세요.");
      return;
    }
    if (end && timeToMinutes(end) <= timeToMinutes(start)) {
      alert("종료 시간은 시작 시간보다 늦어야 해요.");
      return;
    }

    data.events.push({
      id: crypto.randomUUID(),
      date: toDateKey(selectedDailyDate),
      start,
      end,
      title,
      category,
      memo,
      createdAt: Date.now(),
    });
    saveData();
    e.target.reset();
    resetTimeSelectsToDefault();
    renderAll();
  });

  document.getElementById("prevDay").addEventListener("click", () => {
    selectedDailyDate = new Date(selectedDailyDate);
    selectedDailyDate.setDate(selectedDailyDate.getDate() - 1);
    renderDailyView();
  });
  document.getElementById("nextDay").addEventListener("click", () => {
    selectedDailyDate = new Date(selectedDailyDate);
    selectedDailyDate.setDate(selectedDailyDate.getDate() + 1);
    renderDailyView();
  });

  document.getElementById("prevMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderMonthlyView();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderMonthlyView();
  });

  document.getElementById("prevYear").addEventListener("click", () => {
    yearCursor -= 1;
    renderYearlyView();
  });
  document.getElementById("nextYear").addEventListener("click", () => {
    yearCursor += 1;
    renderYearlyView();
  });
}

// ---------- 시작 ----------
renderHeader();
setupTimeSelects();
bindEvents();
renderAll();

// 타임라인을 현재 시각 근처로 자동 스크롤
setTimeout(() => {
  const wrap = document.querySelector(".timeline-wrap");
  if (wrap) wrap.scrollTop = Math.max(today.getHours() * 40 - 100, 0);
}, 0);
