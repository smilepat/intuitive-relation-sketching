---
project: intuitive-relation-sketching
status: active
progress: 95
updated: 2026-08-06
pc: LAPTOP-H10A7AH0
---

# intuitive-relation-sketching — STATUS

## 🎯 한 줄 상태
빠른 기호 팔레트까지 완료 — 기호를 누르면 캔버스에 바로 삽입(무장전 방식), 기호 세트 확장.
타입검사·빌드 통과. **GitHub Pages 라이브 확인됨.** 남은 건 브라우저 수동 검증과 M6c.

## 📊 진행 체크리스트
- [x] 도형 미리보기 버그 수정 + Phase 1(동기 히스토리·버튼상태·redo·Shift 고정)
- [x] 개발 환경 구축 (Node LTS 포터블 설치)
- [x] M1: 단일 HTML → Vite+Svelte+TS 구조 전환 (기능 동등)
- [x] GitHub Pages 배포 워크플로 추가
- [x] M2a: 벡터 객체 모델 재작성 (구조적 undo/redo, 선명한 리사이즈)
- [x] M2b: 선택/이동/삭제 도구 + JSON 불러오기 UI
- [x] M3: localStorage 자동저장/복원 + 사용자 지문 입력 + 글자 크기 조절
- [x] M4: 다중 지문 라이브러리 + 학습 기록 히스토리 뷰
- [x] M6a: 마우스 대안 — 기호 스탬프 + 관계 템플릿 v1 (SKETCH_ALTERNATIVES.md 참조)
- [x] M6b: 문장 단어 칩 (클릭/드래그 배치, 구절 합치기)
- [x] 빠른 기호 팔레트 확대 + 누르면 바로 삽입(2026-08-01, `e99d5a7`) — 기존 stamp 도구 제거
- [x] GitHub Pages 활성화 · 배포 라이브 (https://smilepat.github.io/intuitive-relation-sketching/)
- [x] repo-ops 편입(2026-08-05~06) — `REPO_OPS.md`·`CLAUDE.md`·`scripts/repo-ops-*.ps1`
- [ ] 브라우저에서 M1~M4·M6a·M6b·기호 팔레트 수동 확인  ← 현재 위치
- [ ] M6c: 노드-엣지 모델 / M6d: 키보드+스냅

## ⏭️ 다음에 할 일 (Next Actions)
1. `npm run dev`로 실행: 단어 칩 클릭/드래그 배치, 구절 합치기, 기호 누르면 바로 삽입 확인
2. M6c(노드-엣지 모델) 착수

## 🤔 결정 대기 (Decisions Needed)
- M6b~M6d 결정 D1(칩 언어)·D4(엣지 라벨)·D5~D7 — SKETCH_ALTERNATIVES.md 5절

## 🔗 Claude Code 재개 프롬프트
"STATUS.md와 DEVPLAN.md 읽고 intuitive-relation-sketching 이어서 하자"
