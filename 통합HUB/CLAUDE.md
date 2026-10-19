# 통합HUB

로컬에서 실행하는 개인용 웹 허브. 여러 도구를 사이드바에 추가해가는 구조.

## 구조

- `index.html` — 허브 전체 레이아웃 (사이드바 + 상단바 + 통계 타일 + 뷰 패널)
- `styles.css` — 전체 디자인 (라이트/다크 모드 자동 대응)
- `app.js` — 로직 (현재는 할일 관리 기능만)

## 할일 관리 도구

- 데이터는 브라우저 `localStorage`(key: `hub_todos_v1`)에 저장. **이 PC의 이 브라우저에만** 저장됨 (다른 기기/브라우저에서는 안 보임).
- 일별 뷰: 오늘 날짜(`todayKey`) 기준 할일만 보여줌.
- 월별 뷰: 캘린더에서 날짜 클릭 → 그 날짜의 할일을 오른쪽 패널에서 추가/관리.
- 우선순위: high(빨강) / mid(노랑) / low(초록).

## 실행 방법

- 기본: `index.html`을 브라우저로 더블클릭해서 열면 됨. 서버 불필요.
- **로컬 전용 웹서버가 로그인 시 자동으로 떠 있음.** `통합HUB` 폴더를 `http://localhost:8787`(= `http://127.0.0.1:8787`)로 서비스한다. 아무 때나 브라우저에서 저 주소로 들어가면 됨.
  - `127.0.0.1`에만 바인딩되어 있어서 **이 컴퓨터 밖에서는 접근 불가** (같은 와이파이의 다른 기기에서도 안 보임).
  - 자동 실행 방식: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\통합HUB-서버.vbs` — 윈도우 로그인 시 자동으로 `python.exe -m http.server 8787 --bind 127.0.0.1 --directory <통합HUB 경로>`를 창 없이 실행한다. 원본은 `통합HUB/start-server-silent.vbs`.
    - **주의**: `pythonw.exe`가 아니라 `python.exe`를 써야 함. `pythonw.exe`는 콘솔이 없어서 `http.server`가 요청마다 로그를 찍으려다(`sys.stderr`가 없어서) 매 요청이 끊기는 문제가 있었음. `python.exe`를 숨긴 창(`WshShell.Run ..., 0, False`)으로 띄우면 콘솔은 존재하되 화면엔 안 보여서 정상 동작함.
  - 끄려면: 작업 관리자에서 `python.exe`(통합HUB 서버) 프로세스를 종료하거나, 시작프로그램 폴더의 `통합HUB-서버.vbs`를 지우면 다음 로그인부터 자동 실행 안 됨.
  - 지금 당장 수동으로 켜고 싶으면 `통합HUB/start-server.bat`를 더블클릭 (브라우저 탭도 자동으로 열어줌, 창을 닫으면 그 서버는 꺼짐 — 자동 시작된 서버와는 별개 프로세스).
  - `file://`로 직접 열면 브라우저 보안 정책 때문에 `blog/blog-log.json`을 자동으로 못 읽어오지만(`fetch` 차단), `http://localhost:8787`로 열면 이 문제가 없어서 블로그 발행 기록이 진짜로 자동 반영된다.

## 다음 단계 아이디어 (아직 미구현)

- 여러 기기에서 같은 데이터 보기 → 작은 백엔드 서버 + DB로 전환
- 새 도구 추가 시: 사이드바에 `nav-item` 추가하고, 해당 도구 전용 뷰 패널/JS 작성
- 할일 수정(편집), 반복 할일, 날짜 이동(미완료 항목 다음날로 넘기기) 기능

## 도구 구조 (멀티 페이지)

각 도구는 자기 폴더에 `index.html` + `app.js` (+ 필요하면 `styles.css`)를 가진 별도 페이지.
공통 레이아웃(사이드바/상단바/통계타일/패널카드)은 루트 `styles.css`를 공유해서 `<link>`로 불러옴.
각 페이지는 사이드바 마크업을 직접 포함하고 있음 (빌드 도구가 없어서 컴포넌트 공유 대신 복붙 구조).

- `/schedule/` (`index.html`, `app.js`, `styles.css`) — 일정관리 (사이드바 맨 위, 가장 먼저 쓰는 도구)
- `/` (`index.html`, `app.js`) — 할일 관리 (일별/월별)
- `/marathon/` (`index.html`, `app.js`, `styles.css`) — 마라톤 훈련일지
- `/golf/` (`index.html`, `app.js`, `styles.css`) — 골프 기록
- `/golflearn/` (`index.html`, `app.js`, `styles.css`) — 골프학습일지
- `/ailearn/` (`index.html`, `app.js`, `styles.css`) — AI학습일지 (Claude Code / AI 활용 학습 기록)
- `/blog/` (`index.html`, `app.js`, `styles.css`, 그 외 `agents/`, `guides/`, `output/`, `blog-log.json`) — 블로그 자동화 기록 (리서치→글쓰기→이미지→조립 파이프라인 산출물 로그)

공통 통계 보조텍스트(`.stat-sub`) / 버튼(`.ghost-btn`) / 차트(`.chart-*`) / 범례(`.legend-*`) 스타일은
루트 `styles.css`에 있고, 도구별 `styles.css`는 그 도구만의 꾸미기(폼, 리스트, 카드)만 담당.

### 마라톤 훈련일지

- 데이터: localStorage key `hub_marathon_v1` = `{ runs[], weights[], races[] }`
  - `runs`: {id, date, distanceKm, durationSec, type, memo, createdAt}
  - `weights`: {date, weightKg} — 날짜당 1개(덮어쓰기)
  - `races`: {id, name, date, distance, note}
- 뷰: 일별(기록 입력/체중 입력) / 월별(캘린더 히트맵 + 일별거리 막대그래프 + 체중 추이 라인그래프) / 연간(월별 막대그래프 + 요약 통계)
- 차트는 외부 라이브러리 없이 순수 SVG로 직접 그림 (`app.js`의 `renderBarChart`/`renderLineChart`)
- 색상은 기존 `--accent`(인디고) 하나를 sequential 색조로 사용 (`color-mix()`로 농도 조절) — dataviz 스킬의 "sequential = 단일 색조" 규칙 적용

### 골프 기록

- 데이터: localStorage key `hub_golf_v1` = `{ rounds[] }`
  - `rounds`: {id, date, time, course, holes(9|18), par, score, good, bad, memo, createdAt}
  - 오버파(`score - par`)는 저장하지 않고 화면에서 그때그때 계산 (`formatOverPar`)
- 뷰: 일별(라운드 입력: 시간/구장/홀수/파/타수/잘된점/안된점/메모) / 월별(캘린더 + 라운드별 스코어 추이 라인그래프) / 연간(월별 평균타수 막대그래프 + 요약)
- 상단 "라운드 회고" 카드: 모든 라운드의 잘된 점/안된 점을 날짜 역순으로 모아서 항상 보여줌 (뷰 전환과 무관하게 유지) — 나중에 복기용으로 참조하기 쉽게 하기 위함
- 캘린더는 마라톤의 "히트맵 농도" 대신 **상태색(초록=파 이하, 빨강=오버파)** 사용 — 거리처럼 "많을수록 좋다"가 아니라 "낮을수록 좋다"라서 색 의미를 다르게 설계함
- 차트 함수(`renderBarChart`/`renderLineChart`)는 마라톤과 별개로 `golf/app.js`에 자체 구현 (현재 구조상 JS 모듈 공유를 안 하므로 도구마다 복붙됨 — 나중에 도구가 더 늘면 `shared.js` 같은 공통 스크립트로 추출할 것)

### 일정관리

- 데이터: localStorage key `hub_schedule_v1` = `{ events[] }`
  - `events`: {id, date, start, end(선택), title, category(work/personal/appointment/health/etc), memo, createdAt}
  - (중요 표시 기능은 만들었다가 사용자 요청으로 제거함 — 다시 필요하면 `important` 필드부터 추가)
- 시간 입력은 네이티브 `<input type="time">` 대신 30분 단위 `<select>` 드롭다운 사용 (`setupTimeSelects`) — 네이티브 시간 위젯이 한국어 로케일에서 좁은 폭 때문에 깨져 보이는 문제 때문에 교체함
- 카테고리 색상 토큰(`--cat-work` 등)은 `schedule/styles.css`에 정의, 라이트/다크 모드 각각 값 있음
- 뷰: 일별(24시간 타임라인 시각화 + 겹치는 일정 자동 경고 + 입력폼/리스트) / 월별(캘린더 카테고리 색점 + 카테고리별 분포 막대그래프 + 이번 달 일정 전체 리스트) / 연간(월별 추이 막대그래프 + 요약)
- 상단 통계 타일 "다음 일정": 중요 표시 없이 그냥 시간순으로 가장 가까운 다음 일정 하나를 보여줌
- 겹침(충돌) 감지: 시작·종료가 모두 있는 일정끼리만 비교 (`detectConflicts`), 종료시간 없는 일정은 타임라인에 점으로만 표시되고 충돌 계산에서 제외

### 골프학습일지

- 데이터: localStorage key `hub_golflearn_v1` = `{ entries[] }`
  - `entries`: {id, date, type(youtube/outdoor/indoor/lesson/round/etc), title, content, keyPoint(선택), createdAt}
- 핵심 기능 "🔁 오늘의 복습": `keyPoint`를 남긴 기록 중 매번 무작위 3개를 뽑아 상단에 항상 보여줌 (분산 복습/retrieval practice 원리) — "다시 뽑기" 버튼으로 재추첨
- "🔥 연속 학습일" 스트릭: 오늘 기록이 아직 없어도 어제까지 연속이면 스트릭 유지 (하루가 아직 안 끝났다고 보고 끊지 않음) — `computeStreak()`
- 뷰: 일별(학습 기록 입력 — 방식/제목/배운 내용/핵심 포인트) / 월별(캘린더 방식 색점 + 방식별 횟수 막대그래프 + 이번 달 기록 전체 리스트) / 연간(월별 추이 막대그래프 + 요약)
- 학습 방식 색상 토큰(`--type-youtube` 등)은 `golflearn/styles.css`에 정의

### AI학습일지

- 골프학습일지와 거의 같은 구조(일별/월별/연간, 캘린더 색점, 방식별 분포 그래프, 연속 학습일 스트릭)를 기반으로 하되, "전문가로 성장"에 맞춘 기능 추가:
  - 데이터: localStorage key `hub_ailearn_v1` = `{ entries[] }`
    - `entries`: {id, date, type(command/prompt/automation/mcp/debug/etc), title, understand(1~5), content, keyPoint(선택), applied(선택, 실전 적용 메모), createdAt}
  - **복습 우선순위**: 무작위가 아니라 `understand <= 3`(이해도 낮음)인 기록을 먼저 섞어서 채우고, 부족하면 이해도 높은 것으로 채움 (`renderRecallList`) — 약점 위주 복습이 효율적이라는 설계 의도
  - **실전 적용 메모(`applied`)**: 배우기만 하고 끝나지 않게, 실제로 써본 사례를 남기는 칸 (연간 요약에 "실전 적용 횟수"로 집계)
  - **검색(`searchInput`)**: 월별 뷰의 "이번 달 학습 기록 전체" 리스트를 제목/내용/핵심포인트/적용메모/출처/AI평가 기준으로 필터링 — 기록이 쌓일수록 개인 Claude Code 치트시트처럼 찾아볼 수 있게 함
  - **출처(`source`)**: 유튜브 링크를 넣으면 자동으로 클릭 가능한 링크로 렌더링(`isUrl()`로 http(s) 여부 판별), 책 페이지처럼 URL이 아니면 "📖 " 접두사 붙여 텍스트로 표시
  - **독서(책) 카테고리(`book`)** 추가 — 책으로 공부한 내용도 기록 가능. 색상은 violet(`--type-book`)
  - **AI 평가(`aiReview`)**: 이 앱 자체는 정적 페이지라 Claude API를 직접 호출하지 않음 — 사용자가 채팅에서 Claude에게 자료를 평가받은 뒤 그 결과를 붙여넣어 기록으로 남기는 용도. 실시간 자동 평가가 필요해지면 그때 백엔드/API 연동을 검토할 것 (사용자가 "일단 제목만 자동"을 선택, API 키/로컬서버 방식은 보류)
  - **유튜브 제목 자동 채우기**: 출처 입력란에 유튜브 링크를 넣고 포커스를 벗어나면(`change` 이벤트) `fetchYoutubeTitle()`이 공개 oEmbed 엔드포인트(`https://www.youtube.com/oembed?...&format=json`, API 키 불필요)로 영상 제목을 가져와 제목 칸이 비어있을 때만 자동으로 채움. 실패 시 "직접 입력해주세요" 안내

### 블로그 자동화 기록

- 다른 도구와 달리 이 도구는 **Claude Code 에이전트 파이프라인**(`blog/agents/researcher.md` → `writer.md` → `image-maker.md` → `assembler.md`, 자세한 흐름은 `blog/CLAUDE.md` 참고)이 만들어내는 블로그 글들을 한곳에서 보기 위한 "발행 기록 로그"다. 날짜별 다이어리가 아니라 단일 리스트 뷰.
- **두 가지 기록 소스**를 합쳐서 보여줌:
  - **자동 기록**: `blog/blog-log.json` 파일. 파이프라인이 글 한 편(assembler 단계)을 완성할 때마다 `{id, topic, date, outputDir, createdAt}` 항목을 추가하도록 되어 있음.
  - **수동 기록**: localStorage key `hub_blog_v1` = `{ posts[] }` (이 PC의 이 브라우저에만 저장). 화면에서 직접 "새 글 수동 추가"로 넣은 것.
- 페이지를 열면 `fetch('./blog-log.json')`으로 자동 로드를 먼저 시도하고, 새로 발견한 항목은 localStorage에도 합쳐서 캐싱함.
  - **주의**: `index.html`을 `file://`로 직접 더블클릭해서 열면 브라우저(특히 Chrome)가 로컬 JSON `fetch`를 막을 수 있음. 이 경우를 대비해 "blog-log.json 파일 선택해서 불러오기" 버튼(`<input type="file">` + `FileReader`)을 항상 폴백으로 둠 — 로컬 서버(`python -m http.server` 등)로 열면 자동 fetch가 정상 동작함.
- 리스트의 각 항목은 자동/수동 배지, 주제, 날짜, `outputDir/final.html`로 가는 링크, 삭제 버튼으로 구성.
- 통계 타일: 총 발행 글 수 / 이번 달 발행 수 / 마지막 발행일.
