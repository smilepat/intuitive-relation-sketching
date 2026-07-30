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

## 마일스톤 M1 — 구조 전환 (기능 동등)

목표: 현재 `index.html`의 **모든 기능을 그대로** 유지하면서 Vite+Svelte+TS 프로젝트로 이전.
새 기능은 이 마일스톤에서 추가하지 않음 (동작 회귀 방지가 최우선).

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

- **M2 — Phase 3 벡터 객체 모델**: 마크를 `{type, points, color, width, text}` 데이터로.
  선택/이동/삭제, 선명한 리사이즈, 스케치 JSON *불러오기*.
- **M3 — Phase 2 사용자 체감 기능**: localStorage 자동저장, 사용자 지문 입력, 글자 크기 독립 조절.
- **M4 — 콘텐츠 확장**: 다중 지문 라이브러리, 학습 기록 히스토리 뷰.
- **M5 — 접근성**: 키보드 조작, 스크린리더, 색상 외 구분.

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
