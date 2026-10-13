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

`index.html`을 브라우저로 더블클릭해서 열면 됨. 서버 불필요.

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
