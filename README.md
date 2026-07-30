# 직관적 관계 스케칭 (Intuitive Relation Sketching)

영어 지문의 각 문장을 번역문으로 옮겨 적는 대신, 문장 속 **관계와 변화**를
단어·선·기호·공간 배치로 표현하며 독해 사고력을 기르는 웹 앱입니다.

**Vite + Svelte + TypeScript**로 구축되어 있습니다. (최초 프로토타입은 `legacy/index.html`에 보존.)

## 기능

- **지문 + 문장 연습**: 하나의 지문과 10개의 연습 문장, 각 문장의 패턴·난이도 표시
- **직관 그리기 타이머**: 문장마다 권장 제한 시간 카운트다운
- **사고 유도 질문**: 막힐 때만 여는 힌트 패널 (정답 그림 없음)
- **자기 설명 + 체크리스트**: 그림을 말로 설명하고 원문과 대조 점검
- **스케치 캔버스**: 펜 · 직선 · 화살표 · 상자 · 원 · 단어 입력 · 지우개, 색상/굵기,
  실행 취소/다시 실행(Ctrl+Z), 전체 지우기
- **저장**: 스케치 PNG 저장, 학습 기록(JSON) 저장

## 개발

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
npm run check    # svelte-check 타입 검사
```

### 구조
```
src/
  main.ts                 진입점
  App.svelte              레이아웃 + 상태 오케스트레이션
  app.css                 전역 스타일
  lib/
    data/passages.ts      지문·문장 데이터(타입 포함)
    canvas/engine.ts      프레임워크 비의존 스케치 엔진
    components/           Toolbar · CanvasBoard · TextDialog
legacy/index.html         최초 단일 파일 프로토타입(참조용)
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 빌드 후 **GitHub Pages**로 배포합니다.
(리포지토리 Settings → Pages → Source를 "GitHub Actions"로 설정해야 최초 배포가 활성화됩니다.)

## 라이선스

미정.
