# 개발 계획 (DEVPLAN)

> 단일 `index.html` 프로토타입 → 유지보수 가능한 제품으로 전환하는 계획.
> 확정 결정 포함. 최종 업데이트: 2026-07-30

## 확정된 결정

| 항목 | 선택 | 비고 |
|---|---|---|
| UI 프레임워크 | **Svelte** | 가볍고 보일러플레이트 최소, 이 규모 학습 도구에 최적 |
| 빌드 도구 | **Vite** | 빠른 dev 서버, 간단한 정적 빌드 |
| 언어 | **TypeScript** | 데이터/모델 타입 안정성 |
| 배포 | **GitHub Pages** | 정적 SPA 무료, Actions로 자동 배포 |
| 첫 마일스톤 | **구조 전환만 (기능 동등 이식)** | 새 기능 없이 안전하게 토대부터 |

## 선행 조건 (환경) — ⚠️ 사용자 액션 필요

이 머신엔 **Node.js가 없어** 아무 빌드도 못 함. 아래 설치가 모든 후속 작업의 전제.

```powershell
winget install OpenJS.NodeJS.LTS   # UAC "예" 클릭
# 새 터미널에서 확인:
node -v ; npm -v
```

설치 완료 후 아래 마일스톤 M1을 에이전트가 진행.

## 마일스톤 M1 — 구조 전환 (기능 동등)  ✅ 구현 완료 (브라우저 수동 검증 대기)

목표: 현재 `index.html`의 **모든 기능을 그대로** 유지하면서 Vite+Svelte+TS 프로젝트로 이전.
새 기능은 이 마일스톤에서 추가하지 않음 (동작 회귀 방지가 최우선).

> 상태: Vite+Svelte+TS로 이전 완료. `npm run check`(타입) 및 `npm run build` 통과.
> 원본은 `legacy/index.html`로 보존. GitHub Pages 배포 워크플로 추가.
> **남은 것**: 실제 브라우저에서 아래 체크리스트 수동 확인.

### M1 작업 순서
1. **스캐폴드** — 기존 파일 보존하며 Vite 프로젝트 생성
   ```powershell
   npm create vite@latest . -- --template svelte-ts
   npm install
   ```
   (기존 `index.html`은 `legacy/index.html`로 백업 후 참조용으로 보관)
2. **정적 자산/데이터 이전**
   - `passage`, `sentenceData` → `src/lib/data/passages.ts` (타입 정의 포함)
3. **캔버스 엔진 이전** — 프레임워크 비의존 순수 TS 모듈
   - `src/lib/canvas/engine.ts` — begin/move/end, drawShape, 동기 스냅샷 undo/redo, Shift 고정
4. **UI 컴포넌트 분해** (Svelte)
   - `App.svelte` — 레이아웃
   - `Sidebar/*` — 지문·문장선택·타이머·힌트·자기설명·체크리스트·저장
   - `Toolbar.svelte`, `CanvasBoard.svelte`, `StatusBar.svelte`, `TextDialog.svelte`
5. **스타일 이전** — 기존 CSS를 컴포넌트 스코프/전역으로 분리 (`:root` 변수는 전역 유지)
6. **동작 검증** — 기존 기능 체크리스트로 회귀 확인 (아래)
7. **배포 파이프라인** — GitHub Actions로 build → GitHub Pages
   - `vite.config` `base` 를 `/intuitive-relation-sketching/` 로 설정
   - `.github/workflows/deploy.yml` 추가

### M1 완료 기준 (기능 동등 체크리스트)
- [ ] 지문 전체 보기 토글
- [ ] 문장 10개 선택 → 카드·패턴·난이도 갱신
- [ ] 타이머 시작/일시정지/초기화, 완료 표시
- [ ] 사고 유도 질문 토글
- [ ] 도구 7종(펜·직선·화살표·상자·원·텍스트·지우개)
- [ ] Shift 도형 고정 (45°/정사각형/정원)
- [ ] 색상 4종 · 굵기 슬라이더
- [ ] undo/redo(동기, 버튼 비활성화), Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
- [ ] 전체 지우기 (확인창)
- [ ] 텍스트 삽입 다이얼로그
- [ ] 자기 설명 textarea
- [ ] 자기 점검 체크리스트 + 결과 메시지
- [ ] PNG 저장 · 학습 기록 JSON 저장
- [ ] 반응형(980/560px)

## 이후 마일스톤 (M1 완료 후)

- **M2 — Phase 3 벡터 객체 모델**: 마크를 `{kind, points/a/b/text, color, width}` 데이터로.
  - ✅ **M2a 완료**: 엔진을 벡터 객체 모델(`Mark[]`)로 재작성. 캔버스는 마크의 순수 렌더.
    구조적 undo/redo(비트맵 스냅샷 제거), 리사이즈 시 선명한 재렌더. 기능 100% 동등 유지.
    엔진에 `getMarks()`/`loadMarks()` 추가(향후 JSON 불러오기용, UI 미연결).
  - ✅ **M2b 완료**: 선택/이동 도구(✥) — 클릭 히트테스트로 요소 선택, 드래그로 이동,
    Delete/Backspace로 삭제, 점선 박스로 선택 표시. 학습 기록 JSON에 벡터 마크(`sketchMarks`)
    포함 + **불러오기 UI**(스케치·설명·체크리스트·문장 복원).
- **M3 — Phase 2 사용자 체감 기능** ✅ 완료: localStorage 자동저장/복원(스케치·설명·체크리스트·
  선택 문장·사용자 지문·글자 크기), 사용자 지문 입력(붙여넣기 → 문장 자동 분리), 글자 크기 독립 조절.
- **M4 — 콘텐츠 확장** ✅ 완료: 다중 지문 라이브러리(지문 선택 드롭다운, 기본 3개 + 내 지문),
  학습 기록 히스토리 뷰(저장 시 localStorage에 누적, 열기/삭제/전체 지우기).
- **M5 — 접근성**: 키보드 조작, 스크린리더, 색상 외 구분.
- **M6 — 저마찰 스케칭 입력 (마우스 프리핸드 대안)** 📋 계획 완료 → 상세: [SKETCH_ALTERNATIVES.md](SKETCH_ALTERNATIVES.md).
  프리핸드는 공존 옵션으로 유지하고, 손그림 없이 관계를 표현하는 방식을 추가.
  - **M6a**: 기호 스탬프(↑↓↔·원인/결과/조건) + 관계 템플릿 v1. 엔진 최소 변경(`'stamp'` 도구, `commitMarks()`, `loadMarks` 미지-kind 필터), 신규 `templates.ts`·`TemplateDialog.svelte`.
  - **M6b**: 문장 단어 칩(현재 문장 토큰화 → 클릭/드래그로 라벨 배치, 구절 합치기). 모델 변경 없음.
  - **M6c**: 노드/엣지 모델(`node`/`edge` kind, 클릭 연결, 노드 이동 시 엣지 추종, 삭제 연쇄). 유일한 큰 확장; 템플릿·칩을 노드로 재타겟.
  - **M6d**: 키보드 조작 + 스냅(단축키·화살표 이동·Tab 선택·그리드 스냅) — M5 접근성과 결합.
  - 추천 순서: **A+C(M6a) → B(M6b) → D(M6c) → 키보드/스냅(M6d)**. 결정 대기 D1–D7은 문서 참조.

## 품질 · 자동화 (M1과 함께 도입)

- **ESLint + Prettier** — 코드 스타일 일관성
- **Vitest** — 기하 계산·모델 단위 테스트 (`constrainPoint`, 벡터 모델 등)
- **Playwright** — 캔버스 E2E (선택, M2 이후)
- **GitHub Actions CI** — push마다 `lint` + `test` + `build`

## 환경 메모 (이 머신)

- `git`은 PATH에 없음 → `C:\Program Files\Git\cmd\git.exe`. 터미널 앞에:
  `$env:Path = "C:\Program Files\Git\cmd;" + $env:Path`
- 인증: Git Credential Manager 캐시됨 (재로그인 불필요).
- `node`/`npm` 미설치 ← **M1 착수 전 반드시 설치**.
- `gh` 미설치(선택). Docker 불필요.
- ⚠️ `pc: github-actions` 자동화가 `STATUS.md`를 원격에 커밋함 — 로컬/원격 어긋남 주의.
