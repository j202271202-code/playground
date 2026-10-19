// ============================================================
// 통합HUB - AI학습일지 (Claude Code / AI 활용 학습 기록)
// 데이터는 브라우저 localStorage에 저장됩니다 (이 PC, 이 브라우저 전용)
// ============================================================

const STORAGE_KEY = "hub_ailearn_v1";

const TYPE_META = {
  command: { label: "명령어/슬래시커맨드", color: "var(--type-command)" },
  prompt: { label: "프롬프트 작성법", color: "var(--type-prompt)" },
  automation: { label: "자동화/스크립트", color: "var(--type-automation)" },
  mcp: { label: "MCP·도구연동", color: "var(--type-mcp)" },
  debug: { label: "디버깅/트러블슈팅", color: "var(--type-debug)" },
  book: { label: "독서(책)", color: "var(--type-book)" },
  etc: { label: "개념/기타", color: "var(--type-etc)" },
};

function isUrl(s) {
  return /^https?:\/\//i.test(s || "");
}
function isYoutubeUrl(s) {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(s || "");
}

// 유튜브 oEmbed로 영상 제목만 가져옴 (API 키 불필요, 공개 엔드포인트)
async function fetchYoutubeTitle(url) {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  if (!res.ok) throw new Error("oEmbed 요청 실패");
  const json = await res.json();
  return json.title;
}

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
const today = new Date();

// ---------- 데이터 저장/불러오기 ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch (e) {
    console.warn("AI학습일지 데이터를 불러오지 못했습니다.", e);
    return { entries: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("AI학습일지 데이터를 저장하지 못했습니다.", e);
  }
}

let data = loadData();

// ---------- 상태 ----------
let selectedDailyDate = new Date();
let calendarCursor = new Date();
let yearCursor = new Date().getFullYear();
let searchTerm = "";

// ============================================================
// 조회 helper
// ============================================================
function entriesOn(dateKey) {
  return data.entries.filter((e) => e.date === dateKey).sort((a, b) => a.createdAt - b.createdAt);
}
function entriesInMonth(y, m) {
  return data.entries.filter((e) => {
    const d = parseDateKey(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
function entriesInYear(y) {
  return data.entries.filter((e) => parseDateKey(e.date).getFullYear() === y);
}
function topType(entries) {
  const count = {};
  for (const e of entries) count[e.type] = (count[e.type] || 0) + 1;
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return sorted ? { type: sorted[0], count: sorted[1] } : null;
}
function computeStreak() {
  let d = new Date(today);
  if (entriesOn(toDateKey(d)).length === 0) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (entriesOn(toDateKey(d)).length > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ============================================================
// 헤더 / 통계 타일
// ============================================================
function renderHeader() {
  const now = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) 오늘 배운 걸 남겨보세요`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

function renderStatTiles() {
  const now = new Date();
  const monthEntries = entriesInMonth(now.getFullYear(), now.getMonth());
  document.getElementById("statStreak").textContent = computeStreak() + " 일";
  document.getElementById("statMonthCount").textContent = monthEntries.length + " 회";
  document.getElementById("statTotalCount").textContent = data.entries.length + " 회";

  const avgEl = document.getElementById("statAvgUnderstand");
  if (monthEntries.length > 0) {
    const avg = monthEntries.reduce((sum, e) => sum + (e.understand || 0), 0) / monthEntries.length;
    avgEl.textContent = avg.toFixed(1) + " / 5";
  } else {
    avgEl.textContent = "-";
  }
}

// ============================================================
// 복습 (이해도 낮은 것 우선 + 무작위)
// ============================================================
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
function renderRecallList() {
  const pool = data.entries.filter((e) => e.keyPoint && e.keyPoint.trim());
  const listEl = document.getElementById("recallList");
  const emptyEl = document.getElementById("recallEmpty");

  emptyEl.hidden = pool.length > 0;
  listEl.innerHTML = "";
  if (pool.length === 0) return;

  const weak = shuffle(pool.filter((e) => (e.understand || 3) <= 3));
  const strong = shuffle(pool.filter((e) => (e.understand || 3) > 3));
  const picks = [...weak, ...strong].slice(0, 3);

  for (const e of picks) {
    const isWeak = (e.understand || 3) <= 3;
    const div = document.createElement("div");
    div.className = "recall-item" + (isWeak ? " is-weak" : "");
    const point = document.createElement("div");
    point.className = "recall-point";
    point.textContent = e.keyPoint;
    const meta = document.createElement("div");
    meta.className = "recall-meta";
    const badge = document.createElement("span");
    badge.className = "understand-badge" + (isWeak ? " is-weak" : "");
    badge.textContent = `이해도 ${e.understand || "-"}/5`;
    meta.append(badge, document.createTextNode(`${e.date} · ${TYPE_META[e.type].label} · ${e.title}`));
    div.append(point, meta);
    listEl.appendChild(div);
  }
}

// ============================================================
// 공통: 학습 기록 아이템 생성
// ============================================================
function buildEntryItem(e, { showDate } = {}) {
  const li = document.createElement("li");
  li.className = "entry-item";

  const head = document.createElement("div");
  head.className = "entry-head";
  const tag = document.createElement("span");
  tag.className = "type-tag";
  tag.style.background = TYPE_META[e.type].color;
  tag.textContent = TYPE_META[e.type].label;
  const titleEl = document.createElement("span");
  titleEl.className = "entry-title";
  titleEl.textContent = e.title;
  const understandBadge = document.createElement("span");
  understandBadge.className = "understand-badge" + ((e.understand || 3) <= 3 ? " is-weak" : "");
  understandBadge.textContent = `이해도 ${e.understand || "-"}/5`;
  head.append(tag, titleEl, understandBadge);
  if (showDate) {
    const dateEl = document.createElement("span");
    dateEl.className = "entry-date";
    dateEl.textContent = e.date;
    head.appendChild(dateEl);
  }

  const contentEl = document.createElement("div");
  contentEl.className = "entry-content";
  contentEl.textContent = e.content;

  li.append(head, contentEl);

  if (e.source) {
    const src = document.createElement("div");
    src.className = "entry-source";
    if (isUrl(e.source)) {
      const a = document.createElement("a");
      a.href = e.source;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "▶ 영상 다시보기";
      src.appendChild(a);
    } else {
      src.textContent = "📖 " + e.source;
    }
    li.appendChild(src);
  }
  if (e.keyPoint) {
    const kp = document.createElement("div");
    kp.className = "entry-keypoint";
    kp.textContent = e.keyPoint;
    li.appendChild(kp);
  }
  if (e.applied) {
    const ap = document.createElement("div");
    ap.className = "entry-applied";
    ap.textContent = e.applied;
    li.appendChild(ap);
  }
  if (e.aiReview) {
    const ar = document.createElement("div");
    ar.className = "entry-airreview";
    const label = document.createElement("span");
    label.className = "ar-label";
    label.textContent = "🤖 AI 평가";
    ar.appendChild(label);
    ar.appendChild(document.createTextNode(e.aiReview));
    li.appendChild(ar);
  }

  const delBtn = document.createElement("button");
  delBtn.className = "entry-delete-btn";
  delBtn.textContent = "삭제 ✕";
  delBtn.addEventListener("click", () => {
    data.entries = data.entries.filter((x) => x.id !== e.id);
    saveData();
    renderAll();
  });
  li.appendChild(delBtn);

  return li;
}

// ============================================================
// 일별 뷰
// ============================================================
function renderDailyView() {
  const dateKey = toDateKey(selectedDailyDate);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][selectedDailyDate.getDay()];
  document.getElementById("dailyTitle").textContent =
    dateKey === todayKey
      ? "오늘"
      : `${selectedDailyDate.getMonth() + 1}월 ${selectedDailyDate.getDate()}일 (${weekday})`;

  const entries = entriesOn(dateKey);
  const listEl = document.getElementById("entryList");
  const emptyEl = document.getElementById("entryEmpty");
  listEl.innerHTML = "";
  emptyEl.hidden = entries.length > 0;
  for (const e of entries) listEl.appendChild(buildEntryItem(e));
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

  const monthEntries = entriesInMonth(y, m);
  const byDate = {};
  for (const e of monthEntries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = toDateKey(cellDate);
    const isOutside = cellDate.getMonth() !== m;
    const isToday = key === todayKey;
    const dayEntries = byDate[key] || [];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day" + (isOutside ? " is-outside" : "") + (isToday ? " is-today" : "");

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    if (dayEntries.length > 0) {
      const dots = document.createElement("div");
      dots.className = "day-dots";
      for (const e of dayEntries.slice(0, 4)) {
        const dot = document.createElement("span");
        dot.style.background = TYPE_META[e.type].color;
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
      if (dayEntries.length > 4) {
        const more = document.createElement("div");
        more.className = "day-count";
        more.textContent = "+" + (dayEntries.length - 4);
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

function renderTypeChart() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const monthEntries = entriesInMonth(y, m);

  const items = Object.entries(TYPE_META).map(([key, meta]) => ({
    label: meta.label,
    value: monthEntries.filter((e) => e.type === key).length,
    color: meta.color,
  }));
  renderBarChart(document.getElementById("typeBarChart"), items, {
    formatValue: (v) => v + "회",
  });

  const legendEl = document.getElementById("typeLegend");
  legendEl.innerHTML = "";
  for (const meta of Object.values(TYPE_META)) {
    const span = document.createElement("span");
    span.className = "type-legend-item";
    span.innerHTML = `<span class="type-dot" style="background:${meta.color}"></span>${meta.label}`;
    legendEl.appendChild(span);
  }
}

function renderMonthEntryList() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  let entries = entriesInMonth(y, m).sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));

  const term = searchTerm.trim().toLowerCase();
  if (term) {
    entries = entries.filter((e) =>
      [e.title, e.content, e.keyPoint, e.applied, e.source, e.aiReview]
        .filter(Boolean)
        .some((t) => t.toLowerCase().includes(term))
    );
  }

  document.getElementById("monthEntryListTitle").textContent =
    `${y}년 ${m + 1}월 학습 기록 전체 (${entries.length}건)`;

  const listEl = document.getElementById("monthEntryList");
  const emptyEl = document.getElementById("monthEntryEmpty");
  listEl.innerHTML = "";
  emptyEl.hidden = entries.length > 0;
  for (const e of entries) listEl.appendChild(buildEntryItem(e, { showDate: true }));
}

function renderMonthlyView() {
  renderCalendar();
  renderTypeChart();
  renderMonthEntryList();
}

// ============================================================
// 연간 뷰
// ============================================================
function renderYearlyView() {
  document.getElementById("yearTitle").textContent = `${yearCursor}년`;

  const yearEntries = entriesInYear(yearCursor);
  const monthlyCounts = Array.from({ length: 12 }, (_, m) => ({
    label: `${m + 1}월`,
    value: yearEntries.filter((e) => parseDateKey(e.date).getMonth() === m).length,
  }));
  renderBarChart(document.getElementById("yearBarChart"), monthlyCounts, {
    formatValue: (v) => v + "회",
  });

  const top = topType(yearEntries);
  const keyPointCount = yearEntries.filter((e) => e.keyPoint && e.keyPoint.trim()).length;
  const appliedCount = yearEntries.filter((e) => e.applied && e.applied.trim()).length;
  const activeDays = new Set(yearEntries.map((e) => e.date)).size;
  const avgUnderstand =
    yearEntries.length > 0
      ? (yearEntries.reduce((sum, e) => sum + (e.understand || 0), 0) / yearEntries.length).toFixed(1)
      : "-";

  const summaryEl = document.getElementById("yearSummary");
  const items = [
    { label: "총 학습 횟수", value: yearEntries.length + " 회" },
    { label: "학습한 날 수", value: activeDays + " 일" },
    { label: "가장 많이 공부한 주제", value: top ? `${TYPE_META[top.type].label} (${top.count}회)` : "-" },
    { label: "평균 이해도", value: avgUnderstand === "-" ? "-" : avgUnderstand + " / 5" },
    { label: "핵심 포인트 수", value: keyPointCount + " 개" },
    { label: "실전 적용 횟수", value: appliedCount + " 회" },
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
  renderRecallList();
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

  document.getElementById("shuffleReview").addEventListener("click", renderRecallList);

  document.getElementById("entrySource").addEventListener("change", async (e) => {
    const url = e.target.value.trim();
    const statusEl = document.getElementById("sourceStatus");
    const titleInput = document.getElementById("entryTitle");
    statusEl.textContent = "";
    statusEl.className = "source-status";

    if (!isYoutubeUrl(url)) return;
    if (titleInput.value.trim()) return; // 제목을 이미 직접 적었으면 덮어쓰지 않음

    statusEl.textContent = "제목 가져오는 중...";
    try {
      const title = await fetchYoutubeTitle(url);
      titleInput.value = title;
      statusEl.textContent = "✓ 제목을 가져왔어요";
      statusEl.className = "source-status is-ok";
    } catch (err) {
      statusEl.textContent = "제목을 가져오지 못했어요. 직접 입력해주세요.";
      statusEl.className = "source-status is-error";
    }
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderMonthEntryList();
  });

  document.getElementById("entryAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("entryType").value;
    const title = document.getElementById("entryTitle").value.trim();
    const understand = parseInt(document.getElementById("entryUnderstand").value, 10);
    const content = document.getElementById("entryContent").value.trim();
    const source = document.getElementById("entrySource").value.trim();
    const keyPoint = document.getElementById("entryKeyPoint").value.trim();
    const applied = document.getElementById("entryApplied").value.trim();
    const aiReview = document.getElementById("entryAiReview").value.trim();

    if (!title || !content) {
      alert("제목과 배운 내용을 입력해주세요.");
      return;
    }

    data.entries.push({
      id: crypto.randomUUID(),
      date: toDateKey(selectedDailyDate),
      type,
      title,
      understand,
      content,
      source,
      keyPoint,
      applied,
      aiReview,
      createdAt: Date.now(),
    });
    saveData();
    e.target.reset();
    document.getElementById("entryType").value = "command";
    document.getElementById("entryUnderstand").value = "3";
    document.getElementById("sourceStatus").textContent = "";
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
bindEvents();
renderAll();
