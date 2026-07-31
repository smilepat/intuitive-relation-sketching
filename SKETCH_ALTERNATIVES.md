# 스케칭 입력 대안 설계 (Low-Friction Sketch Input)

> **문제**: PC에서 마우스 프리핸드 스케칭은 어렵고 느리다.
> **목표**: 현재 프리핸드 캔버스를 **한 옵션으로 유지**하되, 손그림 실력 없이도 관계를 표현할 수
> 있는 **저마찰 입력 방식**을 추가한다.
> 이 문서는 **계획**이다(코드 미변경). Fable 5 모델이 실제 코드를 읽고 작성했다.
> 최종 업데이트: 2026-07-31

## 0. 코드에서 나온 제약 (모든 설계가 지켜야 함)

`src/lib/canvas/engine.ts`의 `Mark`는 ID 없는 평면 판별 유니온:

```ts
type Mark =
  | { kind: 'pen' | 'eraser'; color; width; points: Point[] }
  | { kind: 'line' | 'arrow' | 'rect' | 'ellipse'; color; width; a: Point; b: Point }
  | { kind: 'text'; color; width; at: Point; text: string; size?: number };
```

1. **마크에 ID가 없다.** 선택=배열 인덱스, undo=배열 전체 `structuredClone`. 마크 간 **참조**(노드에 붙어 따라오는 화살표)가 필요하면 **ID/노드 개념 추가**가 유일한 실제 모델 변경.
2. **"라벨 상자"는 지금 무관한 마크 2개.** `rect`+`text`를 넣으면 상자만 이동 시 글자가 남음 → **노드(도형+라벨 = 한 단위)**는 새 kind가 맞다.
3. **`commit()`은 private·단일 마크**(마크당 undo 1회). 템플릿이 여러 마크를 한 번에 넣으려면 **`commitMarks(marks: Mark[])`**(undo 1회) 필요 — 모든 구조적 방식이 공유하는 작은 핵심 변경.
4. **저장은 자연히 가법적.** `irs.state.v2`, `irs.history.v1`, export JSON 모두 raw `Mark[]` 저장. **union에 kind 추가는 기존 데이터를 깨지 않음.** 단, `loadMarks`에 **미지 kind 필터**를 방어적으로 추가.
5. **지우개는 픽셀 기반**(`destination-out`)이라 노드 위에서 어색할 수 있음 → 결정 D6.
6. **문장 데이터의 `pattern`이 이미 관계**(`빠른 도달 ↔ 판단 약화`) → **템플릿 자동 추천 훅**.
7. **엔진은 프레임워크 비의존 TS** — 새 방식도 같은 패턴(순수 모델/기하는 엔진, DOM/UI는 Svelte). Vitest 커버리지도 이렇게 가능.

**예시 문장**(문장 5, `빠른 도달 ↔ 판단 약화`):
> "A person who always follows directions may arrive quickly, but may not develop the ability to judge routes independently."

## 1. 대안 평가

### A. 기호 스탬프 (Symbol/word stamp)
- **무엇**: `↑ ↓ ↔ → ⟳ ≠ ✕ ! ?` + 관계어(`원인 결과 조건 그러나 대조 반복`) 원클릭 배치. (TextDialog 플레이스홀더가 이미 "의존 ↑, 판단력 ↓, 그러나"를 유도 중.)
- **모델 매핑**: `kind:'text'` 100% 재사용. 엔진에 `Tool`값 `'stamp'` + `stampValue` + `setStamp()`; `begin()`에서 stamp 클릭 시 즉시 커밋. 선택/이동/삭제/undo/저장 전부 그대로 작동(텍스트 마크이므로).
- **노력 S**, 위험 거의 없음(글리프 폰트 커버리지 정도).
- **평가**: 주석(annotation) 절반에 대해 마찰 대비 효과 최고. 노드 배치·연결은 못함 → 보완재.

### B. 문장 단어 칩 (Sentence word chips) / 드래그앤드롭
- **무엇**: `current.text`를 단어 칩으로 토큰화해 툴바-캔버스 사이 스트립에 표시. 칩 클릭(또는 드래그)→ 캔버스 라벨. Shift-클릭으로 연속 단어를 구절로 합쳐 배치("judge routes independently").
- **모델 매핑**: 드롭→`text` 마크(v1), 이후 `node`로 승격 가능. 좌표는 **pointer 드래그**(HTML5 네이티브 DnD 지양 — 좌표/키보드 문제). `pointFromEvent`와 동일 방식.
- **노력 M**(클릭 배치만이면 S). 위험: 토큰화 경계, 반응형 스트립 공간.
- **평가**: 핵심 활동의 **가장 큰 단일 마찰 감소** + 교육적으로 온메시지(전사 대신 핵심어 **선택**). 칩은 영어 → 한글 개념어는 텍스트 도구로 보완.

### C. 관계 템플릿 + 관계 빌더 폼 (Templates)
- **무엇**: `원인→결과(A→B)`, `대조(A↔B)`, `조건(if A ⇢ then B)`, `증감(A↑/B↓)`, `순서(A→B→C)` 템플릿. 슬롯 채우고 삽입 → 깔끔한 다이어그램. `pattern`으로 카테고리 자동 추천 가능(결정 D2).
- **모델 매핑**:
  - **v1(모델 변경 없음)**: `text`+`arrow/line`로 컴파일(상자는 생략 — fact #2). `commitMarks()` + 순수 레이아웃 함수(`ctx.measureText`)만 필요.
  - **v2(노드 도입 후)**: 진짜 박스 노드+타입 엣지.
- **노력 S–M**(v1). 위험: 생성물이 기존 마크와 겹침(중앙 삽입 후 드래그로 해결).
- **평가**: "이해→캔버스"까지 가장 빠름. 단, 가장 스캐폴드/최소 공간적 → "정답 그림은 없습니다" 철학과 충돌 가능 → 시작 배치일 뿐 재배치·주석 전제. 타이머 게이팅 고려(D3). **접근성 최상(폼)**.

### D. 노드-그래프 빌더 (node + edge)
- **무엇**: **노드 도구**(클릭→라벨 입력→박스/타원/plain 노드) + **연결 도구**(노드 A 클릭→B 클릭→경계에 붙는 커넥터, 관계 라벨 선택). 노드 이동 시 엣지가 따라옴.
- **모델 매핑 — 유일한 실제 확장**:
  ```ts
  | { kind:'node'; id; shape:'rect'|'ellipse'|'plain'; at:Point; text; size?; color; width }
  | { kind:'edge'; from:id; to:id; style:'arrow'|'line'|'double'; label?; color; width }
  ```
  - node: `at`=중심, 박스 치수는 그릴 때 `measureText`로 유도(저장 안 함). `drawMark/markBounds/hitMark/translatedMark`에 케이스 추가.
  - edge: 기하는 **유도(저장 안 함)** — 그릴 때 두 노드 경계 교점 계산, 화살촉 코드 재사용. `translatedMark`=no-op(노드 따라감).
  - `deleteSelected` **연쇄 삭제**(노드 삭제→엣지 삭제, undo 1회로 커버 — 현 전체배열 스냅샷의 이점). 새 도구 `'node'|'connect'`, `pendingConnectFrom`, `onEdgeLabelRequest` 콜백.
  - **공존**: 같은 `marks` 배열, z-order=배열 순서, 프리핸드 무영향, undo/redo/clear/export 그대로.
- **노력 M–L**(엔진 diff 최대지만 begin/move/end·저장 코드 무변경). 위험: 타원 경계 교점, dangling id(렌더 skip + loadMarks 필터), 연결 모드 stuck(Esc 취소).
- **평가**: 구조적 마크를 **재배치에 견고**하게 만드는 기반 — 마우스 사용자가 프리핸드로 못 하는 것. 템플릿·칩이 이 위로 승격. 비용 최고 → **두 번째** 투자.

### E. 스냅 (grid / endpoint snap)
- 배치물(스탬프·칩·노드·템플릿) 그리드 정렬 + 화살표 끝이 노드 경계 근처면 붙기(+엣지로 승격). (1)은 모델 변경 없음(커밋 전 양자화, 토글). Alt로 우회(기존 Shift 관례 대응). 노력 S. 프리핸드엔 스냅 안 함.

### F. 키보드 조작 (quick-add)
- 도구 단축키(`V/P/A/T/N/C`), `T`→입력→Enter 자동 배치, 화살표 이동, Tab 선택, Esc 취소. `nudgeSelected/selectNext` 필요. **이게 곧 로드맵의 M5 접근성 실체** → 이중 계상. 기존 `handleKey`(typing 가드)에 연결.

### 기각: 별도 "컨셉맵 모드"
저장/undo/export/선택 도구를 분기시키고 단일 `Mark[]` 원칙과 충돌 → 비권장. 위 방식 전부 한 배열에 섞여 30% 프리핸드 + 70% 구조가 가능해야 함.

## 2. 비교표

| 방법 | 노력 | 엔진 변경 | 마찰 감소 | 단독? | 키보드 |
|---|---|---|---|---|---|
| A. 스탬프 | **S** | 거의 없음 | 높음(주석) | 아니오(보완) | 쉬움 |
| B. 문장 칩 | **M**(클릭만 S) | 없음 v1 | **매우 높음**(라벨) | 대체로 | 최상 |
| C. 템플릿/폼 | **S–M** v1 | `commitMarks()`만 | **매우 높음**(관계 전체) | 예 | 최상 |
| D. 노드+엣지 | **M–L** | 실제 확장(union+2도구) | 높음+견고 | 예 | 어려움(후순위) |
| E. 스냅 | S | 소 | 중(품질) | 아니오(증폭) | 조력 |
| F. 키보드 | S–M | 소 | 중 | 아니오(횡단) | 핵심 |

## 3. 추천

**A + C 먼저, 이어서 B.** A와 C-v1은 엔진 수술 거의 없이(도구값 1개 + `commitMarks()`) 마찰 양쪽(관계 뼈대=C, 주석=A)을 며칠 안에 커버, 독립 테스트 가능. **B**는 개념적 최대 승리지만 드래그 상호작용이라 별도 단계. **D**는 두 번째 투자 — 먼저 하면 사용자 가치가 최고 위험 작업 뒤로 밀림. **프리핸드는 전 과정 공존**(같은 배열, 제거 없음).

## 4. 단계 계획 (M6a–d, DEVPLAN 양식)

각 단계: 타입검사+빌드 통과, 기능 동등 체크리스트, `irs.state.v2`/`irs.history.v1`/export JSON 하위호환(모두 union 가법적, 구 데이터 그대로 로드, M6a에서 `loadMarks` 미지-kind 필터 추가).

### M6a — 기호 스탬프 + 템플릿 v1 (S)
- **engine.ts**: `Tool` += `'stamp'`; `stampValue`+`setStamp()`; stamp 클릭 시 `text` 커밋. 신규 `commitMarks(marks)`(undo 1회). `loadMarks` 미지 kind 필터.
- **신규**: `src/lib/templates.ts`(순수 함수 `(slots, relation, origin, fontSize)→Mark[]`, Vitest 대상), `TemplateDialog.svelte`.
- **Toolbar/App**: 스탬프 스트립, 템플릿 버튼, 상태바 힌트.
- **검증**: 스탬프 배치-이동-undo-저장-재로드; 템플릿 undo 1회; 구 저장 로드.

### M6b — 문장 단어 칩 (M)
- **신규**: `TokenChips.svelte`(토큰화·구절 합치기·클릭/드래그 배치).
- **engine.ts**: 모델 변경 없음, `placeTextAt(text, p)` 추가. (E-1 그리드 스냅 여기로 당겨도 됨.)
- **App**: 스트립을 Toolbar–CanvasBoard 사이에 마운트, 문장 변경 시 리셋(`resetForCurrent` 훅).

### M6c — node/edge 모델 + 연결 도구 (M–L)
- **engine.ts**: union += `node`/`edge`; `drawMark/markBounds/hitMark/translatedMark` 케이스; 노드 id 맵; 삭제 연쇄; 도구 `'node'/'connect'` + 연결 하이라이트 + Esc; `onEdgeLabelRequest`.
- **templates.ts**: 노드+엣지로 재타겟. **TokenChips**: 드롭을 `shape:'plain'` 노드로.
- **호환**: M6a/b export는 그대로 로드; 신규 export를 구 배포에서 열면 미지 kind 미표시(문서화).

### M6d — 키보드 + 스냅 (S–M, ≒ M5 접근성 착수)
- **engine.ts**: `nudgeSelected`, `selectNext/Prev`, 키보드 연결(`focusNextNode`+Enter), Alt-우회 스냅.
- **App**: `handleKey` 확장(단축키·화살표·Tab), 포인터 없이 자동 배치, 색상 외 선택 표시(M5 연결).

## 5. 결정 대기 (Open Decisions)

- **D1 칩 언어**: 영어 칩만 vs "한글로 바꿔쓰기" 추가? (M6b 범위)
- **D2 패턴 자동추천**: 템플릿을 `pattern`으로 미리 채울까? (정답 관계 노출 위험 — 권장: **카테고리만 제안, 슬롯 비움**)
- **D3 타이머 게이팅**: 40초 "직관으로 그리기" 동안 템플릿/칩 잠금? (M6a/b 상태 배선)
- **D4 엣지 라벨 어휘**: 고정(원인/대조/조건/증감) vs 자유 vs 둘 다(권장)
- **D5 툴바 도구 수**: 10개 허용 vs 그룹 재편 (M6c 전 결정)
- **D6 지우개 vs 객체**: 픽셀 지우개 유지(권장) vs 노드 히트 시 객체 삭제
- **D7 시퀀싱**: M6a/b 먼저 Pages 릴리스 vs 통합 릴리스 (관례상 조기 릴리스; 단 STATUS의 M1–M4 브라우저 수동 검증 게이트 먼저 통과 권장)

**단계별 주요 파일**: `engine.ts`(M6a 소·M6c 대), `App.svelte`(전 단계 배선), 신규 `templates.ts`·`TemplateDialog.svelte`·`TokenChips.svelte`·엣지 라벨 popover(M6c). `history.ts`/`passages.ts`/저장 키는 **변경 불필요**.
