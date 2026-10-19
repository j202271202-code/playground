# blog

주제 하나를 던지면 리서치 → 글쓰기 → 이미지 → 조립까지 자동으로 끝내는 블로그 글 작성 자동화 시스템.

## 폴더 구조

- `agents/` — 각 단계를 수행하는 서브 에이전트 지침서 (`researcher.md`, `writer.md`, `image-maker.md`, `assembler.md`)
- `guides/` — 서브 에이전트들이 참고하는 규칙 (`style-guide.md`, `seo-guide.md`, `image-guide.md`)
- `output/[주제]/` — 결과물 저장 위치 (`research.md`, `draft.md`, `images/`, `final.md`, `final.html`)
- `blog-log.json` — 발행 기록 로그. assembler 단계가 끝날 때마다 항목이 추가된다.
- `index.html`, `app.js`, `styles.css` — 통합HUB 허브에 붙은 "블로그 자동화" 도구 페이지. `blog-log.json`을 읽어서 지금까지 발행한 글 목록을 보여준다.

## 메인 에이전트(오케스트레이터) 역할

메인 에이전트는 **직접 리서치하거나 글을 쓰지 않는다.** 아래 4단계를 서브 에이전트에게 위임만 한다.

| 단계 | 지침서 | 산출물 |
|---|---|---|
| 1 | `agents/researcher.md` | `output/[주제]/research.md` |
| 2 | `agents/writer.md` | `output/[주제]/draft.md` |
| 3 | `agents/image-maker.md` | `draft.md`의 `[IMAGE: ...]` 마커 → 실제 이미지 경로 치환 |
| 4 | `agents/assembler.md` | `output/[주제]/final.md`, `final.html`, `blog-log.json` 기록 추가 |

각 단계가 끝날 때마다 사용자에게 무엇이 완료됐는지 짧게 알린 뒤 다음 단계로 넘어간다.

4단계(assembler)가 끝나면 `blog-log.json`에 발행 기록이 자동으로 남고, 통합HUB 허브(`통합HUB/index.html`)의 "블로그 자동화" 메뉴에서 바로 확인할 수 있다.

## 절대 규칙

- 메인 에이전트는 리서치나 글쓰기를 직접 하지 않는다. 반드시 해당 단계의 서브 에이전트 지침서를 따라 위임한다.
