@REPO_OPS.md

# CLAUDE.md — intuitive-relation-sketching

멀티 PC 작업 규율은 위 **[REPO_OPS.md](REPO_OPS.md)** 에 있다 (세 저장소 공용).
아래는 이 저장소에만 해당하는 사항이다.

## 세션 시작 시 읽을 문서

- **[STATUS.md](STATUS.md)** — 지금 상태·진행률·다음 할 일.
- **[HANDOFF.md](HANDOFF.md)** — 구조·아키텍처·제약·환경 특이사항.
- 로드맵은 [DEVPLAN.md](DEVPLAN.md), 입력 설계는 [SKETCH_ALTERNATIVES.md](SKETCH_ALTERNATIVES.md).

## 이 저장소만의 규칙

- 커밋 전 **`npm run check`** (svelte-check 타입 검사)를 통과시킨다 — CI 게이트다.
- `main`에 push하면 `.github/workflows/deploy.yml`이 GitHub Pages에 자동 배포한다.
  push는 곧 배포이므로 빌드가 깨진 상태로 밀지 않는다.

## 빠른 사실

- Vite + Svelte 5(runes) + TypeScript, `<canvas>` 2D. UI는 한국어, 지문은 영어.
- 스케치 엔진은 `src/lib/canvas/engine.ts` (프레임워크 비의존 TS 클래스).
- 라이브: https://smilepat.github.io/intuitive-relation-sketching/
- 최초 단일 HTML 프로토타입은 `legacy/index.html`에 보존.
