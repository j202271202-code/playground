# 리서치: 클로드 코드의 핵심 기능 5가지

> 조사일: 2026-10-17
> 소스 수: 8개 (최신 자료 우선, 광고성 콘텐츠 제외)

## 요약
Claude Code(클로드 코드)는 터미널에서 자연어 명령으로 코드를 읽고 수정하고 테스트·git 작업까지 수행하는 "에이전틱 코딩 도구"다. 핵심 기능은 ① 터미널 네이티브 작업(코드베이스 탐색, 파일 수정, 셀스 명령 실행, git 워크플로), ② 서브에이전트(독립된 컨텍스트 창과 시스템 프롬프트를 가진 보조 에이전트에 작업을 위임), ③ MCP(Model Context Protocol) 연동(외부 도구·데이터 소스와 표준화된 방식으로 연결), ④ CLAUDE.md/메모리(프로젝트·사용자 단위로 지속되는 컨텍스트 기록), ⑤ 플랜 모드/권한 모드(실행 전에 계획을 세우고 승인받거나, 자동 승인/수동 승인 등 권한 수준을 조절)다. 다만 MCP와 전체 개요(overview) 페이지는 이번 검색에서 공식 문서 원문을 직접 확인하지 못했고, 플랜 모드와 허용 규칙(allow rule)의 상호작용에 대해서는 공식 문서 자체가 설명 부족하다는 지적(GitHub 이슈)이 있어 이 부분은 "확인하지 못한 부분"에도 별도로 표시했다.

## 주요 내용

### 1. 터미널 네이티브 작업 (Agentic coding in the terminal)
- Claude Code는 터미널에서 실행되며 코드베이스를 이해하고, 자연어 명령을 통해 일상적인 작업을 처리한다. 복잡한 코드를 설명하거나 git 워크플로(커밋, PR 생성 등)를 처리할 수 있다.
  [출처: Decode Agency - "Claude Code: How agentic coding works in the terminal"](https://decode.agency/article/claude-code-guide/)
- 터미널뿐 아니라 IDE에서 사용하거나 GitHub에서 `@claude`를 태그해 호출하는 방식도 지원한다. 설치 방법으로는 curl 스크립트, Homebrew, WinGet이 권장되며, npm을 통한 설치는 더 이상 권장되지 않는다(deprecated 표시).
  [출처: GitHub anthropics/claude-code README 미러 - upd.dev](https://upd.dev/anthropics/claude-code/src/v2.1.96) (버전별 스냅샷 자료, 정확한 발행일 미확인 — 비교적 오래된 자료일 수 있음)
- 파일 수정, 테스트 실행, git 작업 관리뿐 아니라 코드베이스 검색, 셸 명령 실행, 개발 환경과의 상호작용이 가능하다는 설명도 있다.
  [출처: LetsDataScience - "Claude Code Enables Agentic Coding In Terminal"](https://letsdatascience.com/news/claude-code-enables-agentic-coding-in-terminal-0c6e4a7f)
- 공식 개요 문서 주소는 `code.claude.com/docs/en/overview`로 확인되었으나, 이번 조사에서는 해당 페이지 원문을 직접 열어 확인하지 못했고 다른 자료가 이를 인용하는 형태로만 확인했다.

### 2. 서브에이전트 (Subagents)
- 서브에이전트는 자신만의 컨텍스트 창(context window), 커스텀 시스템 프롬프트, 그리고 자신만의 도구 접근 권한을 가진 별도의 보조 에이전트다. 조건에 맞는 서브에이전트에 작업을 위임하면 해당 서브에이전트가 독립적으로 작업을 수행하고 결과를 반환한다.
  [출처: code.claude.com - "Create custom subagents"](https://code.claude.com/docs/en/sub-agents)
- 서브에이전트는 파일 시스템 기반으로 생성한다. YAML 프런트매터가 포함된 마크다운 파일을 지정된 디렉터리에 두는 방식이며, 프로젝트 단위 서브에이전트는 `.claude/agents/`, 사용자(개인) 단위 서브에이전트는 `~/.claude/agents/`에 둔다. 프로젝트 단위 파일을 버전 관리에 포함시키면 팀원들이 함께 사용·개선할 수 있다.
  [출처: code.claude.com - "Create custom subagents"](https://code.claude.com/docs/en/sub-agents) · [docs.claude.com (SDK 문서, 상대적으로 오래된 버전)](https://docs.claude.com/en/docs/claude-code/sdk/subagents)
- Claude Code에는 Explore, Plan, general-purpose 같은 내장(built-in) 서브에이전트가 포함되어 있다. 예를 들어 Explore는 Haiku 모델 기반의 읽기 전용 에이전트로, 파일 탐색과 코드 검색, 코드베이스 탐색에 특화되어 있다.
  [출처: code.claude.com - "Create custom subagents"](https://code.claude.com/docs/en/sub-agents)
- 여러 세션에 걸쳐 병렬로 협업하는 에이전트가 필요한 경우에는 서브에이전트가 아니라 별도 기능인 "에이전트 팀(agent teams)"을 사용하도록 안내한다. 서브에이전트는 하나의 세션 안에서만 동작한다.
  [출처: code.claude.com - "Create custom subagents"](https://code.claude.com/docs/en/sub-agents)

### 3. MCP (Model Context Protocol) 연동
- MCP는 Anthropic이 만든 개방형(open-source) 표준으로, Claude를 포함한 AI 모델이 로컬 데이터, 외부 도구, 데이터베이스 등과 안전하게 상호작용할 수 있게 해준다. Claude Code에서는 Claude Code가 클라이언트 역할을 하고, 각 MCP 서버가 하나의 외부 시스템과 연결된다.
  [출처: Mondoo - "MCP integration" 가이드](https://mondoo.com/ai-agent-security/skills/github/anthropics/claude-code/mcp-integration/f348a16da828) (3차 자료, 발행일 미확인)
- MCP 서버는 도구(tools), 리소스(resources), 프롬프트(prompts), 외부 이벤트를 노출할 수 있다. 서버 연결 방식은 stdio(로컬 명령 실행, 예: npx), SSE·HTTP(HTTPS URL 연결), WebSocket(WSS URL 연결) 등이 있다고 설명된다.
  [출처: 3차 자료(educative.io, verdent.ai 등 복수 가이드 종합)] — 이번 검색에서 Anthropic 공식 MCP 설명 페이지 원문을 직접 확인하지 못했다.
- 보안 관련 권고로, 신뢰할 수 있는 서버만 연결하고 필요한 최소한의 권한만 부여하며, 새 서버는 위험도가 낮은 읽기 작업으로 먼저 테스트해볼 것을 권장하는 가이드가 있다.
  [출처: 3차 자료 종합 가이드] (출처 신뢰도가 공식 문서보다 낮음, 참고용으로만 기록)

### 4. CLAUDE.md / 메모리 (Memory)
- Claude Code에는 세션 시작 시 로드되는 두 가지 메모리 시스템이 있다: 사용자가 직접 작성하는 CLAUDE.md 파일과, Claude가 사용자의 교정·선호를 바탕으로 스스로 작성하는 자동 메모리(auto memory)다.
  [출처: code.claude.com - "Manage Claude's memory"](https://code.claude.com/docs/en/memory) (동일 내용이 docs.claude.com, docs.anthropic.com에도 미러링되어 있음)
- 두 메모리 시스템 모두 대화 시작 시 로드되지만, 문서는 이를 "강제되는 설정"이 아니라 "컨텍스트"로 취급한다고 설명한다. 특정 행동을 반드시 차단해야 한다면 CLAUDE.md가 아니라 PreToolUse 훅(hook)을 사용하라고 안내한다.
  [출처: code.claude.com - "Manage Claude's memory"](https://code.claude.com/docs/en/memory)
- 메모리 파일의 범위(scope)는 조직 전체에 적용되는 관리형(managed) 파일, 프로젝트 단위 파일(`./CLAUDE.md` 또는 `./.claude/CLAUDE.md`, 소스 관리로 공유), 개인 단위 파일(`~/.claude/CLAUDE.md`)로 나뉜다. 프로젝트별로 비공개 메모를 위한 `.gitignore` 대상 `CLAUDE.local.md` 파일을 쓰는 방법도 일부 3차 가이드에서 언급되지만, 공식 문서의 표에는 명시되어 있지 않았다.
  [출처: code.claude.com - "Manage Claude's memory"](https://code.claude.com/docs/en/memory); CLAUDE.local.md 부분은 [3차 자료 - Vectorize.io, blog.memoryplugin.com 등]
- CLAUDE.md 작성 시 구체적이고 간결하게 쓸 것을 권장한다. 그렇게 하면 Claude가 더 일관되게 지침을 따른다고 설명한다. `/init` 명령으로 초안을 생성할 수 있고, `@경로` 형식의 임포트로 다른 파일을 불러올 수 있으며, 자동 메모리는 세션당 최대 200줄 혹은 약 25KB까지 로드된다는 설명도 있으나, 이는 3차 자료에서 확인된 내용이라 별도로 표시한다.
  [출처: 3차 자료 종합(mejba.me, claude.nagdy.me 등)] — 공식 문서에서 이 수치를 직접 재확인하지는 못했다.

### 5. 플랜 모드 / 권한 모드 (Plan Mode & Permission Modes)
- 플랜 모드는 `claude --permission-mode plan`으로 세션을 시작하거나, `Shift+Tab`으로 전환하거나, 다음 프롬프트 앞에 `/plan`을 붙여서 진입할 수 있다.
  [출처: code.claude.com - "Permission modes"](https://code.claude.com/docs/en/permission-modes)
- 플랜이 제안되면 다음 중 하나를 선택해 승인한다: (1) 승인 후 자동 모드로 시작, (2) 승인 후 편집을 자동으로 수락, (3) 승인 후 각 편집을 수동으로 검토, (4) 피드백을 주고 계획을 계속 다듬기. 승인하면 세션은 플랜 모드에서 선택한 모드로 전환된다. `Ctrl+G`를 누르면 제안된 계획을 기본 텍스트 편집기에서 직접 수정할 수도 있다.
  [출처: code.claude.com - "Permission modes"](https://code.claude.com/docs/en/permission-modes)
- 어떤 권한 모드를 쓸 수 있는지는 실행 환경에 따라 다르다. 웹 상의 클라우드 세션은 자동 수락(auto accept edits)과 플랜 모드를 제공하고, Remote Control 세션은 권한 확인(ask permissions), 자동 수락, 플랜 모드를 제공한다.
  [출처: code.claude.com - "Permission modes"](https://code.claude.com/docs/en/permission-modes)

## 의견이 갈리는 부분
- **쟁점**: 플랜 모드가 "허용 규칙(allow rule)"과 어떻게 상호작용하는지
  - 입장 A(GitHub 이슈 제기자): 공식 문서는 플랜 모드가 allow rule과 어떻게 상호작용하는지 설명하지 않는다. v2.1.136 변경 로그에는 일치하는 `Edit(...)` allow rule이 있어도 플랜 모드가 파일 쓰기를 차단하도록 바뀌었다는 내용이 있다고 지적한다.
    [출처: GitHub anthropics/claude-code Issue #57439](https://github.com/anthropics/claude-code/issues/57439)
  - 입장 B(일부 3차 가이드): 플랜 모드는 "읽기 전용"이며 프롬프트·권한 체계로 강제되는 것이지, 하드 샌드박스는 아니라고 설명한다. 반면 다른 3차 가이드(learn.traeai.com)는 플랜 모드가 "모든 행동 전에 묻는다"고 설명하는데, 이는 공식 설명(읽기 전용 탐색)과 어긋난다.
    [출처: 3차 가이드 종합] — 이 부분은 공식 문서로 명확히 교차 확인하지 못했다.

- **쟁점**: CLAUDE.md의 성격 — "지켜야 하는 규칙"인가 "참고용 컨텍스트"인가
  - 입장 A(공식 문서): CLAUDE.md와 자동 메모리는 로드되긴 하지만 "강제되는 설정이 아니라 컨텍스트"로 취급되며, 반드시 지켜야 할 제약이 필요하면 PreToolUse 훅을 쓰라고 안내한다.
    [출처: code.claude.com - "Manage Claude's memory"](https://code.claude.com/docs/en/memory)
  - 입장 B(3차 가이드): CLAUDE.md는 모델이 무시할 수 있는 "제안"이며, 보장된 강제 메커니즘이 아니라고 설명한다. 이는 공식 문서 설명과 결은 비슷하지만 더 단정적인 표현을 쓴다.
    [출처: 3차 자료 종합(inventivehq.com 등)]

## 확인하지 못한 부분
- Anthropic 공식 MCP(Model Context Protocol) 설명 페이지의 원문을 이번 검색에서 직접 열어 확인하지 못했다. 위 MCP 관련 내용은 모두 3차 가이드(블로그, 코스 사이트 등)를 통해서만 확인된 내용이며, 공식 문서와 대조하지 못했다.
- `code.claude.com/docs/en/overview` 공식 개요 페이지의 원문도 직접 확인하지 못했다. 이 페이지가 "터미널 네이티브 작업"을 공식적으로 어떻게 정의하는지는 3차 자료의 인용을 통해서만 간접 확인했다.
- CLAUDE.local.md(개인 전용, gitignore 대상 메모 파일)와 자동 메모리의 세션당 로드 용량(약 200줄/25KB) 수치는 3차 자료에서만 확인되었고 공식 문서 표에서 직접 재확인하지 못했다.
- 플랜 모드와 allow rule의 상호작용에 대한 최신 공식 설명(버전 v2.1.136 변경 로그 원문)은 GitHub 이슈를 통해 간접적으로만 확인했고, Anthropic 공식 변경 로그 원문을 직접 열어보지는 못했다.
- `claude.com/blog`의 공식 발표 글(신규 기능 발표, 날짜 포함)은 이번 검색에서 직접 확인하지 못했다. "Insights reports, effort levels, remote control, batch, simplify, hooks, agent teams" 등은 3차 블로그(cashandcache.substack.com 등)에서만 언급되었고 발행일도 불명확하다.

## 출처 목록
- [code.claude.com - Create custom subagents (Sub-agents)](https://code.claude.com/docs/en/sub-agents) — 공식 문서, 발행일 불명(최신 버전으로 추정)
- [code.claude.com - Manage Claude's memory](https://code.claude.com/docs/en/memory) — 공식 문서, 발행일 불명(docs.claude.com·docs.anthropic.com에도 미러링)
- [code.claude.com - Permission modes](https://code.claude.com/docs/en/permission-modes) — 공식 문서, 발행일 불명
- [code.claude.com - Hooks guide](https://code.claude.com/docs/en/hooks-guide) — 공식 문서, 발행일 불명 (참고용: PreToolUse 훅 설명 근거)
- [docs.claude.com - Subagents (Claude Code SDK)](https://docs.claude.com/en/docs/claude-code/sdk/subagents) — 공식 문서(구 도메인/SDK 섹션, 상대적으로 오래된 자료일 수 있음)
- [GitHub anthropics/claude-code - Issue #57439 (Documentation Type)](https://github.com/anthropics/claude-code/issues/57439) — 공식 저장소 이슈, 플랜 모드·allow rule 관련 문서 불비 지적
- [Decode Agency - Claude Code: How agentic coding works in the terminal](https://decode.agency/article/claude-code-guide/) — 3차 자료, 발행일 불명
- [Mondoo - MCP integration 가이드](https://mondoo.com/ai-agent-security/skills/github/anthropics/claude-code/mcp-integration/f348a16da828) — 3차 자료, 발행일 불명
