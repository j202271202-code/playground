// ============================================================
// 통합HUB - 마라톤 훈련일지
// 데이터는 브라우저 localStorage에 저장됩니다 (이 PC, 이 브라우저 전용)
// ============================================================

const STORAGE_KEY = "hub_marathon_v1";

const RUN_TYPE_LABEL = {
  easy: "쉬운달리기",
  long: "장거리",
  interval: "인터벌",
  race: "대회",
  etc: "기타",
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
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function dayDiff(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aa - bb) / ms);
}

const todayKey = toDateKey(new Date());

// ---------- 시간/페이스 유틸 ----------
function parseDuration(text) {
  const parts = text.trim().split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 2) {
    [m, s] = parts.map(Number);
  } else if (parts.length === 3) {
    [h, m, s] = parts.map(Number);
  } else {
    return null;
  }
  if (s < 0 || s >= 60 || m < 0) return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}
function formatDuration(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function formatPace(secPerKm) {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "-";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// ---------- 데이터 저장/불러오기 ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { runs: [], weights: [], races: [] };
    const parsed = JSON.parse(raw);
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      races: Array.isArray(parsed.races) ? parsed.races : [],
    };
  } catch (e) {
    console.warn("훈련일지 데이터를 불러오지 못했습니다.", e);
    return { runs: [], weights: [], races: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("훈련일지 데이터를 저장하지 못했습니다.", e);
  }
}

let data = loadData();

// ---------- 상태 ----------
let selectedDailyDate = new Date();
let calendarCursor = new Date();
let yearCursor = new Date().getFullYear();

// ============================================================
// 체중 / 러닝 기록 helper
// ============================================================
function getWeightFor(dateKey) {
  const w = data.weights.find((x) => x.date === dateKey);
  return w ? w.weightKg : null;
}
function setWeightFor(dateKey, weightKg) {
  const existing = data.weights.find((x) => x.date === dateKey);
  if (existing) existing.weightKg = weightKg;
  else data.weights.push({ date: dateKey, weightKg });
  saveData();
}
function latestWeightEntries(n = 2) {
  return [...data.weights].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
}
function runsOn(dateKey) {
  return data.runs.filter((r) => r.date === dateKey).sort((a, b) => a.createdAt - b.createdAt);
}
function runsInMonth(y, m) {
  return data.runs.filter((r) => {
    const d = parseDateKey(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
function runsInYear(y) {
  return data.runs.filter((r) => parseDateKey(r.date).getFullYear() === y);
}
function sumDistance(runs) {
  return runs.reduce((sum, r) => sum + r.distanceKm, 0);
}
function weightedAvgPace(runs) {
  const totalDist = sumDistance(runs);
  if (totalDist <= 0) return NaN;
  const totalSec = runs.reduce((sum, r) => sum + r.durationSec, 0);
  return totalSec / totalDist;
}

// ============================================================
// 헤더 / 통계 타일
// ============================================================
function renderHeader() {
  const now = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) 훈련을 기록해보세요`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

function renderStatTiles() {
  const now = new Date();
  const monthRuns = runsInMonth(now.getFullYear(), now.getMonth());
  const monthDist = sumDistance(monthRuns);
  const monthPace = weightedAvgPace(monthRuns);

  document.getElementById("statMonthDist").textContent = monthDist.toFixed(1) + " km";
  document.getElementById("statMonthPace").textContent = formatPace(monthPace);

  const [latest, prev] = latestWeightEntries(2);
  const weightEl = document.getElementById("statWeight");
  const deltaEl = document.getElementById("statWeightDelta");
  if (latest) {
    weightEl.textContent = latest.weightKg.toFixed(1) + " kg";
    if (prev) {
      const diff = +(latest.weightKg - prev.weightKg).toFixed(1);
      if (diff === 0) {
        deltaEl.textContent = "변화 없음";
        deltaEl.className = "stat-sub";
      } else {
        deltaEl.textContent = (diff > 0 ? "▲ +" : "▼ ") + diff + " kg";
        deltaEl.className = "stat-sub " + (diff < 0 ? "is-good" : "is-warn");
      }
    } else {
      deltaEl.textContent = "";
    }
  } else {
    weightEl.textContent = "- kg";
    deltaEl.textContent = "아직 기록 없음";
  }

  const upcoming = data.races
    .filter((r) => dayDiff(parseDateKey(r.date), now) >= 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const nextRaceEl = document.getElementById("statNextRace");
  const nextRaceDateEl = document.getElementById("statNextRaceDate");
  if (upcoming) {
    const dd = dayDiff(parseDateKey(upcoming.date), now);
    nextRaceEl.textContent = dd === 0 ? "D-DAY" : `D-${dd}`;
    nextRaceDateEl.textContent = `${upcoming.name} · ${upcoming.date}`;
  } else {
    nextRaceEl.textContent = "-";
    nextRaceDateEl.textContent = "예정된 대회가 없어요";
  }
}

// ============================================================
// 대회 일정
// ============================================================
function renderRaceList() {
  const listEl = document.getElementById("raceList");
  const emptyEl = document.getElementById("raceEmpty");
  const sorted = [...data.races].sort((a, b) => (a.date < b.date ? -1 : 1));
  listEl.innerHTML = "";
  emptyEl.hidden = sorted.length > 0;

  const now = new Date();
  for (const race of sorted) {
    const dd = dayDiff(parseDateKey(race.date), now);
    const li = document.createElement("li");
    li.className = "race-item" + (dd < 0 ? " is-past" : "");

    const ddBadge = document.createElement("div");
    ddBadge.className = "race-dday" + (dd < 0 ? " is-done" : dd <= 7 ? " is-urgent" : "");
    ddBadge.textContent = dd < 0 ? "완료" : dd === 0 ? "D-DAY" : `D-${dd}`;

    const info = document.createElement("div");
    info.className = "race-info";
    const nameEl = document.createElement("div");
    nameEl.className = "race-name";
    nameEl.textContent = race.name;
    const metaEl = document.createElement("div");
    metaEl.className = "race-meta";
    metaEl.textContent = `${race.date} · ${race.distance}` + (race.note ? ` · ${race.note}` : "");
    info.append(nameEl, metaEl);

    const delBtn = document.createElement("button");
    delBtn.className = "race-delete";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      data.races = data.races.filter((r) => r.id !== race.id);
      saveData();
      renderAll();
    });

    li.append(ddBadge, info, delBtn);
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

  const w = getWeightFor(dateKey);
  document.getElementById("weightInput").value = w !== null ? w : "";
  document.getElementById("weightSavedHint").textContent = "";

  const listEl = document.getElementById("runList");
  const emptyEl = document.getElementById("runEmpty");
  const runs = runsOn(dateKey);
  listEl.innerHTML = "";
  emptyEl.hidden = runs.length > 0;

  for (const r of runs) {
    const li = document.createElement("li");
    li.className = "run-item";

    const badge = document.createElement("span");
    badge.className = "run-type-badge";
    badge.textContent = RUN_TYPE_LABEL[r.type] || "기타";

    const main = document.createElement("div");
    main.className = "run-main";
    const figures = document.createElement("div");
    figures.className = "run-figures";
    const pace = r.distanceKm > 0 ? r.durationSec / r.distanceKm : NaN;
    figures.innerHTML = `${r.distanceKm.toFixed(2)}km · ${formatDuration(r.durationSec)} <span class="run-pace">${formatPace(pace)}</span>`;
    main.appendChild(figures);
    if (r.memo) {
      const memo = document.createElement("div");
      memo.className = "run-memo";
      memo.textContent = r.memo;
      main.appendChild(memo);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "race-delete";
    delBtn.textContent = "✕";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => {
      data.runs = data.runs.filter((x) => x.id !== r.id);
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

  // 그리드라인 3단
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
    label.textContent = val >= 10 ? Math.round(val) : val.toFixed(1);
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
    rect.setAttribute("height", Math.max(barH, 1));
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
    label.textContent = (maxVal - ((maxVal - minVal) * i) / 2).toFixed(1);
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
    dot.addEventListener("mousemove", (e) => tooltip.show(e, `${p.label}: ${p.value.toFixed(1)}kg`));
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

  const monthRuns = runsInMonth(y, m);
  const byDate = {};
  for (const r of monthRuns) byDate[r.date] = (byDate[r.date] || 0) + r.distanceKm;
  const maxDayDist = Math.max(...Object.values(byDate), 0.001);

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = toDateKey(cellDate);
    const isOutside = cellDate.getMonth() !== m;
    const isToday = key === todayKey;
    const dist = byDate[key] || 0;
    const heat = isOutside ? 0 : Math.round((dist / maxDayDist) * 85) + (dist > 0 ? 10 : 0);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day" + (isOutside ? " is-outside" : "") + (isToday ? " is-today" : "");
    cell.style.setProperty("--heat", heat);

    const numEl = document.createElement("div");
    numEl.className = "day-num";
    numEl.textContent = cellDate.getDate();

    cell.appendChild(numEl);
    if (dist > 0) {
      const distEl = document.createElement("div");
      distEl.className = "day-dist";
      distEl.textContent = dist.toFixed(1) + "km";
      cell.appendChild(distEl);
    }

    cell.addEventListener("click", () => {
      selectedDailyDate = cellDate;
      setActiveView("daily");
      renderAll();
    });

    grid.appendChild(cell);
  }
}

function renderMonthCharts() {
  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  const dim = daysInMonth(y, m);

  const byDate = {};
  for (const r of runsInMonth(y, m)) byDate[r.date] = (byDate[r.date] || 0) + r.distanceKm;
  const barItems = [];
  for (let d = 1; d <= dim; d++) {
    const key = toDateKey(new Date(y, m, d));
    barItems.push({ label: String(d), value: +(byDate[key] || 0).toFixed(2) });
  }
  renderBarChart(document.getElementById("monthBarChart"), barItems, {
    formatValue: (v) => v.toFixed(1) + "km",
  });

  const weightPoints = data.weights
    .filter((w) => {
      const d = parseDateKey(w.date);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ label: String(parseDateKey(w.date).getDate()), value: w.weightKg }));
  renderLineChart(document.getElementById("monthWeightChart"), weightPoints);
}

function renderMonthlyView() {
  renderCalendar();
  renderMonthCharts();
}

// ============================================================
// 연간 뷰
// ============================================================
function renderYearlyView() {
  document.getElementById("yearTitle").textContent = `${yearCursor}년`;

  const yearRuns = runsInYear(yearCursor);
  const monthlyTotals = Array.from({ length: 12 }, (_, m) => ({
    label: `${m + 1}월`,
    value: +sumDistance(yearRuns.filter((r) => parseDateKey(r.date).getMonth() === m)).toFixed(1),
  }));
  renderBarChart(document.getElementById("yearBarChart"), monthlyTotals, {
    formatValue: (v) => v.toFixed(1) + "km",
  });

  const totalDist = sumDistance(yearRuns);
  const avgPace = weightedAvgPace(yearRuns);
  const raceCountYear = data.races.filter((r) => parseDateKey(r.date).getFullYear() === yearCursor).length;
  const longest = yearRuns.reduce((max, r) => Math.max(max, r.distanceKm), 0);

  const summaryEl = document.getElementById("yearSummary");
  const items = [
    { label: "연간 누적 거리", value: totalDist.toFixed(1) + " km" },
    { label: "총 러닝 횟수", value: yearRuns.length + " 회" },
    { label: "평균 페이스", value: formatPace(avgPace) },
    { label: "최장 단일 거리", value: longest.toFixed(1) + " km" },
    { label: "등록된 대회", value: raceCountYear + " 개" },
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
  renderRaceList();
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

  // 대회 추가 폼 토글
  document.getElementById("toggleRaceForm").addEventListener("click", () => {
    const form = document.getElementById("raceAddForm");
    form.hidden = !form.hidden;
  });
  document.getElementById("raceAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("raceName").value.trim();
    const date = document.getElementById("raceDate").value;
    const distance = document.getElementById("raceDistance").value;
    const note = document.getElementById("raceNote").value.trim();
    if (!name || !date) return;
    data.races.push({ id: crypto.randomUUID(), name, date, distance, note });
    saveData();
    e.target.reset();
    document.getElementById("raceAddForm").hidden = true;
    renderAll();
  });

  // 체중 저장
  document.getElementById("weightSaveBtn").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("weightInput").value);
    if (isNaN(val) || val <= 0) {
      alert("체중을 올바르게 입력해주세요.");
      return;
    }
    setWeightFor(toDateKey(selectedDailyDate), val);
    document.getElementById("weightSavedHint").textContent = "저장됨 ✓";
    renderStatTiles();
  });

  // 러닝 기록 추가
  document.getElementById("runAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const distance = parseFloat(document.getElementById("runDistance").value);
    const durationSec = parseDuration(document.getElementById("runDuration").value);
    const type = document.getElementById("runType").value;
    const memo = document.getElementById("runMemo").value.trim();

    if (isNaN(distance) || distance <= 0) {
      alert("거리를 올바르게 입력해주세요. (예: 5, 10.5)");
      return;
    }
    if (durationSec === null) {
      alert("시간 형식이 올바르지 않아요. '분:초' (예: 45:30) 또는 '시:분:초'로 입력해주세요.");
      return;
    }

    data.runs.push({
      id: crypto.randomUUID(),
      date: toDateKey(selectedDailyDate),
      distanceKm: distance,
      durationSec,
      type,
      memo,
      createdAt: Date.now(),
    });
    saveData();
    e.target.reset();
    document.getElementById("runType").value = "easy";
    renderAll();
  });

  // 일별 날짜 이동
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

  // 월 이동
  document.getElementById("prevMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderMonthlyView();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderMonthlyView();
  });

  // 연도 이동
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
