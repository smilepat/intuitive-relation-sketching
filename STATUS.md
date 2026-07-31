---
project: intuitive-relation-sketching
status: active
progress: 50
updated: 2026-07-31
pc: local
---

# intuitive-relation-sketching — STATUS

## 🎯 한 줄 상태
M2a(벡터 객체 모델) 완료 — 엔진을 Mark[] 기반으로 재작성(구조적 undo/redo·선명한 리사이즈), 기능 동등. 타입검사·빌드 통과. 브라우저 수동 검증 대기.

## 📊 진행 체크리스트
- [x] 도형 미리보기 버그 수정 + Phase 1(동기 히스토리·버튼상태·redo·Shift 고정)
- [x] 개발 환경 구축 (Node LTS 포터블 설치)
- [x] M1: 단일 HTML → Vite+Svelte+TS 구조 전환 (기능 동등)
- [x] GitHub Pages 배포 워크플로 추가
- [x] M2a: 벡터 객체 모델 재작성 (구조적 undo/redo, 선명한 리사이즈)
- [ ] 브라우저에서 M1/M2a 기능 동등 수동 확인  ← 현재 위치
- [ ] GitHub Pages 활성화 (Settings → Pages → Source: GitHub Actions)
- [ ] M2b: 선택/이동/삭제 UX + 스케치 JSON 내보내기·불러오기 UI

## ⏭️ 다음에 할 일 (Next Actions)
1. `npm run dev`로 실행해 도형/undo/redo/지우개/리사이즈/저장 동작 확인
2. 리포지토리 Settings에서 Pages를 GitHub Actions로 활성화
3. M2b(선택/이동/삭제, JSON 불러오기) vs M3(Phase 2 사용자 기능) 우선순위 결정

## 🤔 결정 대기 (Decisions Needed)
- 다음 마일스톤: M2b(선택/편집·JSON 불러오기) vs M3(Phase 2: 자동저장·사용자 지문) 우선순위

## 🔗 Claude Code 재개 프롬프트
"STATUS.md와 DEVPLAN.md 읽고 intuitive-relation-sketching 이어서 하자"
