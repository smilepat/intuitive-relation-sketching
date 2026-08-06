# 핸드오프 문서 — 직관적 관계 스케칭

> 다음 작업자(사람 또는 AI 에이전트)가 맥락을 빠르게 잡도록 정리한 인수인계 노트.
> 함께 읽을 것: [DEVPLAN.md](DEVPLAN.md)(로드맵), [STATUS.md](STATUS.md)(현재 위치),
> [SKETCH_ALTERNATIVES.md](SKETCH_ALTERNATIVES.md)(마우스 대안 입력 설계).
> 최종 업데이트: 2026-08-06 · 앱 최신 커밋 `e99d5a7` (이후 커밋은 repo-ops 문서·스크립트)
> 작업 규율은 [REPO_OPS.md](REPO_OPS.md) — 저장소 문서가 각 PC의 로컬 설정보다 항상 우선한다.

## 1. 프로젝트 개요

영어 지문의 각 문장을 **번역문으로 옮겨 적는 대신**, 문장 속 관계·인과·변화를
단어·선·기호·공간 배치로 **표현**하며 독해 사고력을 기르는 학습 도구.

- **기술**: **Vite + Svelte 5(runes) + TypeScript**, `<canvas>` 2D
- **언어**: UI 전체 한국어, 연습 지문은 영어
- **배포**: **라이브** → https://smilepat.github.io/intuitive-relation-sketching/
- 최초 프로토타입(단일 HTML)은 `legacy/index.html`에 보존.

## 2. 실행 / 빌드 / 배포

```bash
npm install      # 의존성
npm run dev      # 개발 서버 http://localhost:5173/intuitive-relation-sketching/
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 미리보기
npm run check    # svelte-check 타입 검사 (CI 게이트로 사용)
```

- **배포**: `main`에 push하면 `.github/workflows/deploy.yml`이 빌드 후 GitHub Pages에 게시.
- Pages는 이미 활성화됨(Source=GitHub Actions). 검증 방식은 아래 "환경 특이사항" 참조.

## 3. 코드 구조

```
src/
  main.ts                     진입점 (mount App)
  App.svelte                  레이아웃 + 모든 상태 오케스트레이션 (사이드바 인라인)
  app.css                     전역 스타일 (원본 CSS 그대로, :root 변수)
  lib/
    canvas/engine.ts          ★ 벡터 스케치 엔진 (프레임워크 비의존 TS 클래스)
    data/passages.ts          지문 라이브러리(3개) + 문장 데이터 + 타입
    templates.ts              관계 템플릿 순수 빌더 + suggestTemplateId
    history.ts                학습 기록 localStorage 히스토리(load/add/remove/clear)
    components/
      Toolbar.svelte          도구·색상·굵기·글자크기·기호 팔레트·템플릿·undo/redo
      CanvasBoard.svelte      <canvas> + 엔진 생성/콜백 연결
      TokenChips.svelte       현재 문장 → 단어 칩(클릭/드래그 배치, 구절 합치기)
      TextDialog.svelte       단어 입력 다이얼로그
      TemplateDialog.svelte   관계 템플릿 선택/슬롯 입력
legacy/index.html             최초 단일 파일 프로토타입(참조용)

REPO_OPS.md                   ★ 멀티 PC 작업 규율 (세 저장소 공용 정본, 동일 사본)
CLAUDE.md                     이 저장소 고유 규칙 + `@REPO_OPS.md` 임포트
scripts/
  repo-ops-check.ps1          규율 준수 자동 점검 (Claude Code 훅에서 호출)
  repo-ops-guard.ps1          PC에 1회 설치하는 런처 — 미적용 저장소 경고
```

### 캔버스 엔진 (`engine.ts`) — 핵심
- **벡터 객체 모델**: 모든 마크가 `Mark[]`에 데이터로 저장되고, 캔버스는 그 **순수 렌더**.
  ```ts
  type Mark =
    | { kind:'pen'|'eraser'; color; width; points: Point[] }
    | { kind:'line'|'arrow'|'rect'|'ellipse'; color; width; a: Point; b: Point }
    | { kind:'text'; color; width; at: Point; text: string; size?: number };
  ```
- **마크에 ID 없음**: 선택=배열 인덱스, undo/redo=배열 `structuredClone` 스냅샷(최대 30).
- 그리는 중 미리보기는 커밋된 마크를 오프스크린 `base`에 캐시 후 그 위에 그림(비동기 경쟁 없음).
- 리사이즈 시 **벡터 재렌더**(비트맵 확대 아님 → 선명).
- 주요 공개 API: `setTool/setColor/setWidth/setFontSize`, `undo/redo/clear/reset`,
  `insertText`, `commitMarks`(템플릿=undo 1회), `placeText/placeTextAuto/placeTextAtClient`(칩·기호),
  `getMarks/loadMarks`(저장/복원, `loadMarks`는 미지 kind 필터), `deleteSelected`, `centerPoint`,
  `toDataURL/exportPNGDataURL`. 콜백: `onHistoryChange/onTextRequest/onSelectionChange/onChange`.

## 4. 스케치 입력 방식 (모두 같은 `Mark[]`에 공존)

1. **프리핸드** — 펜/직선/화살표/상자/원/텍스트/지우개, 색상 4종·굵기·글자크기, Shift 고정.
2. **✥ 선택/이동** — 클릭 히트테스트로 요소 선택, 드래그 이동, Delete/Backspace 삭제, 점선 표시.
3. **기호 팔레트**(툴바) — 자주 쓰는 기호(`→ ← ↑ ↓ ↔ ⇒ = ≠ + − × ? ! ∴ ✓ ★` + 원인/결과/조건/그러나)
   **버튼 누르면 즉시 캔버스에 삽입**(자동 위치). 이후 ✥로 이동.
4. **관계 템플릿** — 원인→결과·대조·조건·증감·순서 슬롯 채우면 다이어그램 생성(undo 1회).
   현재 문장 `pattern`으로 카테고리만 자동 선택(슬롯은 비움).
5. **문장 단어 칩** — 현재 문장을 단어 칩으로 → 클릭=자동 배치, 드래그=원하는 곳, Shift+클릭=구절.

> 배경: PC 마우스 프리핸드가 어렵다는 요구로 3·4·5를 추가(마우스 대안). 설계 근거는 SKETCH_ALTERNATIVES.md.

## 5. 지속성 / 저장

- **자동저장**(`irs.state.v2`): 스케치 마크·설명·체크리스트·선택 문장·지문(passageId, 사용자 지문)·글자크기.
  새로고침해도 복원. 저장은 `onChange`(엔진) + 상태 `$effect`로 디바운스.
- **학습 기록 히스토리**(`irs.history.v1`): "학습 기록 저장" 시 다운로드 + localStorage 누적(최신순, 최대 30).
  사이드바에서 열기/삭제/전체 지우기. 열면 지문·문장·설명·체크리스트·마크 복원.
- 저장 포맷은 **union 가법적** → 마크 kind 추가해도 구 데이터 그대로 로드.

## 6. 완료된 마일스톤 (요약)

| 커밋 | 내용 |
|---|---|
| `e99d5a7` | 기호 팔레트 확장 + 누르면 즉시 삽입, 미사용 stamp 도구 제거 |
| `9aded32` | **M6b** 문장 단어 칩 |
| `b215019` | **M6a** 기호 스탬프 + 관계 템플릿 v1 |
| `720525d` | 마우스 대안 입력 설계 문서(M6 계획) |
| `104e451` | **M4** 다중 지문 라이브러리 + 학습 기록 히스토리 |
| `2883295` | **M3** 자동저장/복원 + 사용자 지문 입력 + 글자 크기 |
| `865dcf7` | **M2b** 선택/이동/삭제 + JSON 불러오기 |
| `5e0bb36` | **M2a** 벡터 객체 모델 재작성 |
| `be25829` | **M1** 단일 HTML → Vite+Svelte+TS 구조 전환 |

## 7. 남은 계획 (미착수)

DEVPLAN.md 기준:
- **M6c — 노드/엣지 모델**: `Mark` union에 `node`(id+라벨) / `edge`(from/to+라벨) 추가.
  클릭 연결, 노드 이동 시 엣지 추종, 삭제 연쇄. **유일한 큰 모델 확장**. 템플릿·칩을 노드로 재타겟.
- **M6d — 키보드 + 스냅**: 도구 단축키·화살표 이동·Tab 선택·그리드 스냅 (≒ M5 접근성 착수).
- **M5 — 접근성**: 키보드 조작, 스크린리더, 색상 외 구분.
- **품질**: Vitest 단위 테스트(엔진 기하/모델, `templates.ts`) + CI에 lint/test 추가.
  현재는 브라우저 수동 검증에 의존 → 회귀 자동 방지 권장.
- 열린 결정 D1~D7은 SKETCH_ALTERNATIVES.md 5절.

## 8. 알려진 한계 / 주의점

- 엣지(연결선) 개념이 아직 없어, 화살표는 노드에 붙지 않고 독립 마크(이동 시 따로 움직임) — M6c에서 해결.
- 텍스트/기호는 배치 후 **내용 편집 불가**(위치·삭제는 가능). 벡터 텍스트 재편집은 미구현.
- 브라우저 자동 E2E 테스트 없음 — `npm run check` + `npm run build`로만 게이트.
- 지우개는 픽셀 방식(destination-out)이라 객체 위에서 시각적으로만 지움(마크는 남음). select+Delete로 객체 삭제 권장.

## 9. 저장소 / 개발 환경 (Windows 특이사항)

- **원격**: https://github.com/smilepat/intuitive-relation-sketching · 기본 브랜치 `main`.
- 로컬 폴더: `C:\Users\eltko\intuitive-relation-sketching`.
- **git이 PATH에 없음** → `C:\Program Files\Git\cmd\git.exe`. 터미널 앞에:
  `$env:Path = "C:\Program Files\Git\cmd;" + $env:Path`
- **node가 PATH에 없을 수 있음**(포터블 설치): `C:\Users\eltko\nodejs` (v24 LTS). 사용자 PATH에 등록됨 — 새 터미널이면 `node -v` 바로 됨. 아니면 `$env:Path = "C:\Users\eltko\nodejs;" + $env:Path`.
- **gh(GitHub CLI) 미설치**(winget 설치는 UAC 필요). 대신 인증은 **Git Credential Manager**(system `credential.helper=manager`, 브라우저 로그인 후 캐시됨)로 처리.
- **커밋 팁**: 한국어 커밋 메시지를 PowerShell here-string으로 넘기면 단어가 쪼개져 실패함 → 메시지를 파일로 저장 후 `git -c commit.gpgsign=false commit -F <file>` 사용.
- **GitHub Pages/Actions API**: gh 없이도 캐시된 자격증명 토큰으로 REST API 호출 가능.
  토큰 추출: `printf "protocol=https\nhost=github.com\n\n" | git credential fill | grep '^password='`.
  Pages 활성화(`POST /repos/{owner}/{repo}/pages {"build_type":"workflow"}`)와
  워크플로 수동 실행(`POST .../actions/workflows/deploy.yml/dispatches {"ref":"main"}`)을 이렇게 처리했음.

## 10. 다음 작업자 추천 순서

1. 라이브 사이트/로컬에서 각 입력 방식(프리핸드·기호·템플릿·칩·선택 이동/삭제) 실제 동작 확인.
2. **품질 도입**(Vitest + CI) 먼저 하면 이후 리팩터링(M6c) 안전. 또는 바로 **M6c** 착수.
3. M6c 진행 시 `Mark` union 확장은 저장 하위호환 유지(가법적) + `loadMarks` 필터/렌더 스킵으로 방어.
