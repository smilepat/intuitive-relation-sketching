---
project: intuitive-relation-sketching
status: active
progress: 80
updated: 2026-07-31
pc: local
---

# intuitive-relation-sketching — STATUS

## 🎯 한 줄 상태
M3(Phase 2) 완료 — 자동저장/복원·사용자 지문 입력·글자 크기 조절 추가. 타입검사·빌드 통과. 브라우저 수동 검증 대기.

## 📊 진행 체크리스트
- [x] 도형 미리보기 버그 수정 + Phase 1(동기 히스토리·버튼상태·redo·Shift 고정)
- [x] 개발 환경 구축 (Node LTS 포터블 설치)
- [x] M1: 단일 HTML → Vite+Svelte+TS 구조 전환 (기능 동등)
- [x] GitHub Pages 배포 워크플로 추가
- [x] M2a: 벡터 객체 모델 재작성 (구조적 undo/redo, 선명한 리사이즈)
- [x] M2b: 선택/이동/삭제 도구 + JSON 불러오기 UI
- [x] M3: localStorage 자동저장/복원 + 사용자 지문 입력 + 글자 크기 조절
- [ ] 브라우저에서 M1~M3 기능 수동 확인  ← 현재 위치
- [ ] GitHub Pages 활성화 (Settings → Pages → Source: GitHub Actions)

## ⏭️ 다음에 할 일 (Next Actions)
1. `npm run dev`로 실행: 새로고침 후 스케치·지문·설정 복원, 내 지문 입력, 글자 크기 확인
2. 리포지토리 Settings에서 Pages를 GitHub Actions로 활성화
3. 다음 방향 결정 (M4 콘텐츠 확장 / M5 접근성 / 테스트 도입 등)

## 🤔 결정 대기 (Decisions Needed)
- 다음 마일스톤 방향: M4(다중 지문 라이브러리·학습기록 히스토리) vs M5(접근성) vs 품질(테스트·CI 강화)

## 🔗 Claude Code 재개 프롬프트
"STATUS.md와 DEVPLAN.md 읽고 intuitive-relation-sketching 이어서 하자"
