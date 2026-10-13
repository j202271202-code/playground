// ============================================================
// 통합HUB - 골프 기록
// 데이터는 브라우저 localStorage에 저장됩니다 (이 PC, 이 브라우저 전용)
// ============================================================

const STORAGE_KEY = "hub_golf_v1";

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

// ---------- 스코어 표기 유틸 ----------
function formatOverPar(overPar) {
  if (overPar === 0) return "E";
  return overPar > 0 ? `+${overPar}` : `${overPar}`;
}

// ---------- 데이터 저장/불러오기 ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rounds: [] };
    const parsed = JSON.parse(raw);
    return { rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [] };
  } catch (e) {
    console.warn("골프 기록을 불러오지 못했습니다.", e);
    return { rounds: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("골프 기록을 저장하지 못했습니다.", e);
  }
}

let data = loadData();

// ---------- 상태 ----------
let selectedDailyDate = new Date();
let calendarCursor = new Date();
let yearCursor = new Date().getFullYear();
let showAllReviews = false;

// ============================================================
// 조회 helper
// ============================================================
function allRoundsSorted() {
  return [...data.rounds].sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1
  );
}
function roundsOn(dateKey) {
  return allRoundsSorted().filter((r) => r.date === dateKey);
}
function roundsInMonth(y, m) {
  return allRoundsSorted().filter((r) => {
    const d = parseDateKey(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
function roundsInYear(y) {
  return allRoundsSorted().filter((r) => parseDateKey(r.date).getFullYear() === y);
}
function avgScore(rounds) {
  if (rounds.length === 0) return NaN;
  return rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length;
}

// ============================================================
// 헤더 / 통계 타일
// ============================================================
function renderHeader() {
  const now = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) 라운드를 기록해보세요`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

function renderStatTiles() {
  const now = new Date();
  const monthRounds = roundsInMonth(now.getFullYear(), now.getMonth());
  document.getElementById("statMonthRounds").textContent = monthRounds.length + " 회";
  document.getElementById("statMonthAvg").textContent =
    monthRounds.length > 0 ? avgScore(monthRounds).toFixed(1) + " 타" : "-";

  const all = allRoundsSorted();
  const bestEl = document.getElementById("statBest");
  const bestMetaEl = document.getElementById("statBestMeta");
  if (all.length > 0) {
    const best = all.reduce((b, r) => (r.score < b.score ? r : b), all[0]);
    bestEl.textContent = best.score + " 타";
    bestMetaEl.textContent = `${best.course} · ${best.date} (${formatOverPar(best.score - best.par)})`;
  } else {
    bestEl.textContent = "-";
    bestMetaEl.textContent = "아직 기록 없음";
  }

  const trendEl = document.getElementById("statTrend");
  const trendMetaEl = document.getElementById("statTrendMeta");
  if (all.length >= 2) {
    const latest = all[all.length - 1];
    const prev = all[all.length - 2];
    const diff = latest.score - prev.score;
    trendEl.textContent = (diff > 0 ? "▲ +" : diff < 0 ? "▼ " : "- ") + Math.abs(diff);
    trendEl.className = "stat-value " + (diff < 0 ? "is-good-text" : diff > 0 ? "is-warn-text" : "");
    trendMetaEl.textContent = `직전 라운드 ${prev.score}타 → 이번 ${latest.score}타`;
  } else {
    trendEl.textContent = "-";
    trendMetaEl.textContent = "비교할 이전 라운드가 없어요";
  }
}

// ============================================================
// 라운드 회고 (잘된 점 / 안된 점 모아보기)
// ============================================================
function renderReviewList() {
  const listEl = document.getElementById("reviewList");
  const emptyEl = document.getElementById("reviewEmpty");
  const btn = document.getElementById("toggleReviewAll");

  let rounds = [...allRoundsSorted()].reverse().filter((r) => r.good || r.bad);
  emptyEl.hidden = rounds.length > 0;
  if (!showAllReviews) rounds = rounds.slice(0, 6);
  btn.textContent = showAllReviews ? "최근만 보기" : "전체 보기";

  listEl.innerHTML = "";
  for (const r of rounds) {
    const li = document.createElement("li");
    li.className = "review-item";

    const head = document.createElement("div");
    head.className = "review-head";
    head.innerHTML = `<strong>${r.course}</strong><span>${r.date}</span><span>${r.score}타 (${formatOverPar(r.score - r.par)})</span>`;

    const tags = document.createElement("div");
    tags.className = "review-tags";
    if (r.good) {
      const t = document.createElement("div");
      t.className = "review-tag is-good";
      t.innerHTML = `<span class="tag-label">잘된 점</span>${r.good}`;
      tags.appendChild(t);
    }
    if (r.bad) {
      const t = document.createElement("div");
      t.className = "review-tag is-bad";
      t.innerHTML = `<span class="tag-label">안된 점</span>${r.bad}`;
      tags.appendChild(t);
    }

    li.append(head, tags);
    listEl.appendChild(li);
  }
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

  const listEl = document.getElementById("roundList");
  const emptyEl = document.getElementById("roundEmpty");
  const rounds = roundsOn(dateKey);
  listEl.innerHTML = "";
  emptyEl.hidden = rounds.length > 0;

  for (const r of rounds) {
    const li = document.createElement("li");
    li.className = "round-item";

    const overPar = r.score - r.par;
    const badge = document.createElement("div");
    badge.className = "score-badge" + (overPar > 0 ? " is-over" : "");
    badge.innerHTML = `${r.score}<span class="score-raw">${formatOverPar(overPar)}</span>`;

    const main = document.createElement("div");
    main.className = "round-main";
    const courseEl = document.createElement("div");
    courseEl.className = "round-course";
    courseEl.textContent = r.course;
    const metaEl = document.createElement("div");
    metaEl.className = "round-meta";
    metaEl.textContent = `${r.time ? r.time + " · " : ""}${r.holes}홀 · 파 ${r.par}`;
    main.append(courseEl, metaEl);

    if (r.good || r.bad) {
      const pts = document.createElement("div");
      pts.className = "round-points";
      if (r.good) {
        const g = document.createElement("span");
        g.className = "pt-good";
        g.textContent = "👍 " + r.good;
        pts.appendChild(g);
      }
      if (r.bad) {
        const b = document.createElement("span");
        b.className = "pt-bad";
        b.textContent = "👎 " + r.bad;
        pts.appendChild(b);
      }
      main.appendChild(pts);
    }
    if (r.memo) {
      const memo = document.createElement("div");
      memo.className = "round-memo";
      memo.textContent = r.memo;
      main.appendChild(memo);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "race-delete";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      data.rounds = data.rounds.filter((x) => x.id !== r.id);
      saveData();
      renderAll();
    });

    li.append(badge, main, delBtn);
    listEl.appendChild(li);
  }
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
  const gap = n > 20 ? 1 : 4;
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
    label.textContent = opts.axisFormat ? opts.axisFormat(val) : Math.round(val);
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
    rect.setAttribute("rx", 2);
    rect.setAttribute("class", "chart-bar");
    rect.addEventListener("mousemove", (e) =>
      tooltip.show(e, `${item.label}: ${opts.formatValue ? opts.formatValue(item.value) : item.value}`)
    );
    rect.addEventListener("mouseleave", () => tooltip.hide());
    svg.appendChild(rect);

    if (idx % labelEvery === 0) {
      const xLabel = document.createElementNS(svg.namespaceURI, "text");
      xLabel.setAttribute("x", x + barW / 2);
      xLabel.setAttribute("y", H - 8);
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.setAttribute("class", "chart-axis-label");
      xLabel.textContent = item.label;
      svg.appendChild(xLabel);
    }
  });

  container.appendChild(svg);
}

function renderLineChart(container, points, opts = {}) {
  container.innerHTML = "";
  if (points.length === 0) {
    container.innerHTML = '<p class="chart-empty-note">아직 기록이 없어요.</p>';
    return;
  }
  const W = 640, H = 220;
  const padL = 40, padR = 14, padT = 18, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values), rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.2, 1);
  const minVal = rawMin - pad;
  const maxVal = rawMax + pad;

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
    const val = maxVal - ((maxVal - minVal) * i) / 2;
    label.textContent = opts.axisFormat ? opts.axisFormat(val) : Math.round(val);
    svg.appendChild(label);
  }

  const xOf = (idx) => padL + (points.length === 1 ? plotW / 2 : (plotW * idx) / (points.length - 1));
  const yOf = (val) => padT + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(p.value)}`).join(" ");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", pathD);
  path.setAttribute("class", "chart-line");
  svg.appendChild(path);

  const tooltip = makeTooltip(container);
  const labelEvery = points.length > 20 ? 5 : points.length > 10 ? 2 : 1;

  points.forEach((p, i) => {
    const cx = xOf(i), cy = yOf(p.value);
    const dot = document.createElementNS(svg.namespaceURI, "circle");
    dot.setAttribute("cx", cx);
    dot.setAttribute("cy", cy);
    dot.setAttribute("r", 4);
    dot.setAttribute("class", "chart-dot");
    dot.addEventListener("mousemove", (e) =>
      tooltip.show(e, `${p.label}: ${opts.formatValue ? opts.formatValue(p.value) : p.value}`)
    );
    dot.addEventListener("mouseleave", () => tooltip.hide());
    svg.appendChild(dot);

    if (i % labelEvery === 0) {
      const xLabel = document.createElementNS(svg.namespaceURI, "text");
      xLabel.setAttribute("x", cx);
      xLabel.setAttribute("y", H - 8);
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.setAttribute("class", "chart-axis-label");
      xLabel.textContent = p.label;
      svg.appendChild(xLabel);
    }
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

  const monthRounds = roundsInMonth(y, m);
  const byDate = {};
  for (const r of monthRounds) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = toDateKey(cellDate);
    const isOutside = cellDate.getMonth() !== m;
    const isToday = key === todayKey;
    const dayRounds = byDate[key] || [];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day" + (isOutside ? " is-outside" : "") + (isToday ? " is-today" : "");

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = cellDate.getDate();
    cell.appendChild(numEl);

    if (dayRounds.length > 0) {
      const best = dayRounds.reduce((b, r) => (r.score < b.score ? r : b), dayRounds[0]);
      const overPar = best.score - best.par;
      const scoreEl = document.createElement("div");
      scoreEl.className = "day-score";
      scoreEl.innerHTML = `<span class="score-dot ${overPar > 0 ? "score-dot--over" : "score-dot--good"}"></span>${best.score}타`;
      cell.appendChild(scoreEl);
    }

    cell.addEventListener("click", () => {
      selectedDailyDate = cellDate;
      setActiveView("daily");
      renderAll();
    });

    grid.appendChild(cell);
  }
}

function renderMonthChart() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const points = roundsInMonth(y, m).map((r) => ({
    label: String(parseDateKey(r.date).getDate()),
    value: r.score,
  }));
  renderLineChart(document.getElementById("monthLineChart"), points, {
    formatValue: (v) => v + "타",
  });
}

function renderMonthlyView() {
  renderCalendar();
  renderMonthChart();
}

// ============================================================
// 연간 뷰
// ============================================================
function renderYearlyView() {
  document.getElementById("yearTitle").textContent = `${yearCursor}년`;

  const yearRounds = roundsInYear(yearCursor);
  const monthlyAvg = Array.from({ length: 12 }, (_, m) => {
    const rs = yearRounds.filter((r) => parseDateKey(r.date).getMonth() === m);
    return { label: `${m + 1}월`, value: rs.length > 0 ? +avgScore(rs).toFixed(1) : 0 };
  });
  renderBarChart(document.getElementById("yearBarChart"), monthlyAvg, {
    formatValue: (v) => v + "타",
  });

  const courseCount = {};
  for (const r of yearRounds) courseCount[r.course] = (courseCount[r.course] || 0) + 1;
  const topCourse = Object.entries(courseCount).sort((a, b) => b[1] - a[1])[0];
  const best = yearRounds.reduce((b, r) => (!b || r.score < b.score ? r : b), null);

  const summaryEl = document.getElementById("yearSummary");
  const items = [
    { label: "총 라운드 수", value: yearRounds.length + " 회" },
    { label: "연간 평균 타수", value: yearRounds.length > 0 ? avgScore(yearRounds).toFixed(1) + " 타" : "-" },
    { label: "베스트 스코어", value: best ? best.score + " 타" : "-" },
    { label: "최다 방문 구장", value: topCourse ? `${topCourse[0]} (${topCourse[1]}회)` : "-" },
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
  renderReviewList();
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

  document.getElementById("toggleReviewAll").addEventListener("click", () => {
    showAllReviews = !showAllReviews;
    renderReviewList();
  });

  document.getElementById("roundHoles").addEventListener("change", (e) => {
    document.getElementById("roundPar").value = e.target.value === "9" ? 36 : 72;
  });

  document.getElementById("roundAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const course = document.getElementById("roundCourse").value.trim();
    const time = document.getElementById("roundTime").value;
    const holes = document.getElementById("roundHoles").value;
    const par = parseInt(document.getElementById("roundPar").value, 10);
    const score = parseInt(document.getElementById("roundScore").value, 10);
    const good = document.getElementById("roundGood").value.trim();
    const bad = document.getElementById("roundBad").value.trim();
    const memo = document.getElementById("roundMemo").value.trim();

    if (!course) {
      alert("구장 이름을 입력해주세요.");
      return;
    }
    if (isNaN(par) || par <= 0 || isNaN(score) || score <= 0) {
      alert("파와 타수를 올바르게 입력해주세요.");
      return;
    }

    data.rounds.push({
      id: crypto.randomUUID(),
      date: toDateKey(selectedDailyDate),
      time,
      course,
      holes,
      par,
      score,
      good,
      bad,
      memo,
      createdAt: Date.now(),
    });
    saveData();
    e.target.reset();
    document.getElementById("roundPar").value = 72;
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
