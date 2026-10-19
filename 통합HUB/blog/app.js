// ============================================================
// 통합HUB - 블로그 자동화 기록
// 자동 기록(blog-log.json, Claude Code 파이프라인이 작성)과
// 수동 기록(localStorage, 이 브라우저에만 저장됨)을 합쳐서 보여줍니다.
// ============================================================

const STORAGE_KEY = "hub_blog_v1";
const LOG_FILE = "./blog-log.json";

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const todayKey = toDateKey(new Date());

// ---------- 데이터 저장/불러오기 (localStorage) ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { posts: [] };
    const parsed = JSON.parse(raw);
    return { posts: Array.isArray(parsed.posts) ? parsed.posts : [] };
  } catch (e) {
    console.warn("블로그 기록을 불러오지 못했습니다.", e);
    return { posts: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("블로그 기록을 저장하지 못했습니다.", e);
  }
}

let data = loadData();

// ---------- 자동 기록(blog-log.json) 병합 ----------
function mergeAutoPosts(json) {
  const incoming = Array.isArray(json.posts) ? json.posts : [];
  const existingIds = new Set(data.posts.map((p) => p.id));
  let addedCount = 0;
  for (const p of incoming) {
    const id = p.id || `${p.topic}-${p.date}`;
    if (existingIds.has(id)) continue;
    data.posts.push({
      id,
      topic: p.topic || "(제목 없음)",
      date: p.date || todayKey,
      outputDir: p.outputDir || "",
      createdAt: p.createdAt || Date.now(),
      source: "auto",
    });
    existingIds.add(id);
    addedCount++;
  }
  if (addedCount > 0) saveData();
  return addedCount;
}

function setAutoloadStatus(text, isError) {
  const el = document.getElementById("autoloadStatus");
  el.textContent = text;
  el.classList.toggle("is-error", !!isError);
}

function tryAutoFetch() {
  setAutoloadStatus("불러오는 중...");
  fetch(LOG_FILE, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("응답 실패: " + res.status);
      return res.json();
    })
    .then((json) => {
      const added = mergeAutoPosts(json);
      setAutoloadStatus(added > 0 ? `자동 기록 ${added}건을 새로 불러왔어요.` : "자동 기록이 최신 상태예요.");
      renderAll();
    })
    .catch((err) => {
      console.warn("blog-log.json 자동 로드 실패:", err);
      setAutoloadStatus("자동으로 못 불러왔어요. 아래 '파일 선택'으로 직접 불러와주세요.", true);
    });
}

function bindAutoImport() {
  document.getElementById("autoFetchBtn").addEventListener("click", tryAutoFetch);
  document.getElementById("autoImportInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        const added = mergeAutoPosts(json);
        setAutoloadStatus(added > 0 ? `파일에서 ${added}건을 불러왔어요.` : "새로 추가된 기록은 없었어요.");
        renderAll();
      } catch (err) {
        console.warn("blog-log.json 파싱 실패:", err);
        setAutoloadStatus("파일을 읽는 데 실패했어요. JSON 형식을 확인해주세요.", true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}

// ---------- 통계 ----------
function renderHeader() {
  const now = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  document.getElementById("dateSubtitle").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) · 글쓰기 파이프라인이 완성한 글들을 한곳에서 확인해요`;
  document.getElementById("todayLabel").textContent = `오늘: ${todayKey}`;
}

function renderStatTiles() {
  const now = new Date();
  const posts = data.posts;
  document.getElementById("statTotal").textContent = posts.length;
  document.getElementById("statMonth").textContent = posts.filter((p) => {
    const d = p.date ? new Date(p.date) : null;
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const last = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  document.getElementById("statLast").textContent = last ? last.date : "-";
}

// ---------- 발행 기록 리스트 ----------
function buildPostItem(p) {
  const li = document.createElement("li");
  li.className = "post-item";

  const head = document.createElement("div");
  head.className = "post-head";

  const tag = document.createElement("span");
  tag.className = "source-tag " + (p.source === "manual" ? "source-manual" : "source-auto");
  tag.textContent = p.source === "manual" ? "수동" : "자동";
  head.appendChild(tag);

  const titleEl = document.createElement("span");
  titleEl.className = "post-title";
  titleEl.textContent = p.topic;
  head.appendChild(titleEl);

  const dateEl = document.createElement("span");
  dateEl.className = "post-date";
  dateEl.textContent = p.date;
  head.appendChild(dateEl);

  li.appendChild(head);

  if (p.outputDir) {
    const link = document.createElement("a");
    link.className = "post-link";
    link.href = encodeURI(`${p.outputDir}/final.html`);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "📄 final.html 열기";
    li.appendChild(link);
  }

  const delBtn = document.createElement("button");
  delBtn.className = "post-delete-btn";
  delBtn.textContent = "삭제 ✕";
  delBtn.addEventListener("click", () => {
    data.posts = data.posts.filter((x) => x.id !== p.id);
    saveData();
    renderAll();
  });
  li.appendChild(delBtn);

  return li;
}

function renderPostList() {
  const posts = [...data.posts].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  const listEl = document.getElementById("postList");
  const emptyEl = document.getElementById("postEmpty");
  listEl.innerHTML = "";
  emptyEl.hidden = posts.length > 0;
  for (const p of posts) listEl.appendChild(buildPostItem(p));
}

// ---------- 전체 렌더 ----------
function renderAll() {
  renderStatTiles();
  renderPostList();
}

// ---------- 이벤트 바인딩 ----------
function bindEvents() {
  document.getElementById("postDate").value = todayKey;

  document.getElementById("postAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const topic = document.getElementById("postTopic").value.trim();
    const date = document.getElementById("postDate").value || todayKey;
    const outputDir = document.getElementById("postOutputDir").value.trim() || `output/${topic}`;

    if (!topic) {
      alert("주제를 입력해주세요.");
      return;
    }

    data.posts.push({
      id: crypto.randomUUID(),
      topic,
      date,
      outputDir,
      createdAt: Date.now(),
      source: "manual",
    });
    saveData();
    e.target.reset();
    document.getElementById("postDate").value = todayKey;
    renderAll();
  });

  bindAutoImport();
}

// ---------- 시작 ----------
renderHeader();
bindEvents();
renderAll();
tryAutoFetch();
