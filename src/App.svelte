<script lang="ts">
  import { passage, sentenceData, type Passage, type Sentence } from './lib/data/passages';
  import { SketchEngine, type Tool, type Point, type Mark } from './lib/canvas/engine';
  import Toolbar from './lib/components/Toolbar.svelte';
  import CanvasBoard from './lib/components/CanvasBoard.svelte';
  import TextDialog from './lib/components/TextDialog.svelte';

  // ---- persistence ----
  const STORAGE_KEY = 'irs.state.v1';

  interface SavedState {
    selectedIndex?: number;
    explanation?: string;
    checks?: boolean[];
    isCustom?: boolean;
    customPassage?: Passage | null;
    customSentences?: Sentence[] | null;
    marks?: Mark[];
    fontSize?: number;
  }

  function readSaved(): SavedState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedState) : null;
    } catch {
      return null;
    }
  }
  const saved = readSaved();
  const savedCustom = !!(saved?.isCustom && saved.customSentences?.length && saved.customPassage);

  // ---- passage / sentence source (default or user-provided) ----
  const initialList: Sentence[] = savedCustom ? saved!.customSentences! : sentenceData;
  const initialIndex = Math.min(Math.max(0, (saved?.selectedIndex ?? 0) | 0), initialList.length - 1);

  let isCustom = $state(savedCustom);
  let sentences = $state<Sentence[]>(initialList);
  let activePassage = $state<Passage>(savedCustom ? saved!.customPassage! : passage);

  // ---- learning-step state ----
  let selectedIndex = $state(initialIndex);
  const current = $derived(sentences[selectedIndex] ?? sentences[0]);

  let passageOpen = $state(false);
  let hintOpen = $state(false);
  let customOpen = $state(false);
  let customText = $state('');
  let explanation = $state(saved?.explanation ?? '');
  let checks = $state<boolean[]>(saved?.checks?.length === 4 ? saved.checks : [false, false, false, false]);
  let feedbackText = $state('');
  let feedbackShown = $state(false);

  // ---- timer ----
  let remaining = $state(initialList[initialIndex]?.time ?? 40);
  let timerId: number | null = null;
  let timerRunning = $state(false);

  const timerLabel = $derived.by(() => {
    if (remaining <= 0) return '완료';
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    return `${m}:${s}`;
  });

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    timerRunning = false;
  }

  function toggleTimer() {
    if (timerId !== null) {
      stopTimer();
      return;
    }
    timerRunning = true;
    timerId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) stopTimer();
    }, 1000);
  }

  function resetTimer() {
    stopTimer();
    remaining = current.time;
  }

  // ---- sketch engine ----
  let engine: SketchEngine | null = null;
  let ready = false;
  let tool = $state<Tool>('pen');
  let color = $state('#172033');
  let width = $state(3);
  let fontSize = $state(saved?.fontSize ?? 20);
  let canUndo = $state(false);
  let canRedo = $state(false);
  let status = $state('펜 도구 · 자유롭게 스케치하세요.');
  let textOpen = $state(false);

  // ---- autosave ----
  let saveTimer: number | null = null;

  function scheduleSave() {
    if (!ready) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 400);
  }

  function saveNow() {
    saveTimer = null;
    const data: SavedState = {
      selectedIndex,
      explanation,
      checks,
      isCustom,
      customPassage: isCustom ? activePassage : null,
      customSentences: isCustom ? sentences : null,
      marks: engine?.getMarks() ?? [],
      fontSize,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }

  function onChange() {
    scheduleSave();
  }

  // Persist whenever tracked content state changes (marks handled via onChange).
  $effect(() => {
    void [selectedIndex, explanation, isCustom, fontSize, sentences.length, ...checks];
    scheduleSave();
  });

  const toolNames: Record<Tool, string> = {
    select: '선택/이동',
    pen: '펜',
    line: '직선',
    arrow: '화살표',
    rect: '상자',
    ellipse: '원',
    text: '단어 입력',
    eraser: '지우개',
  };
  const shapeTools: Record<string, boolean> = { line: true, arrow: true, rect: true, ellipse: true };

  function onReady(e: SketchEngine) {
    engine = e;
    e.setTool(tool);
    e.setColor(color);
    e.setWidth(width);
    e.setFontSize(fontSize);
    if (saved?.marks?.length) e.loadMarks(saved.marks);
    ready = true;
  }

  function onHistoryChange(u: boolean, r: boolean) {
    canUndo = u;
    canRedo = r;
  }

  function onTextRequest(_point: Point) {
    textOpen = true;
  }

  function onSelectionChange(has: boolean) {
    if (tool !== 'select') return;
    status = has ? '선택됨 · 드래그로 이동, Delete로 삭제' : selectBaseStatus();
  }

  function selectBaseStatus() {
    return '선택/이동 도구 · 요소를 클릭해 고르고 드래그로 이동';
  }

  function selectTool(t: Tool) {
    tool = t;
    engine?.setTool(t);
    if (t === 'select') {
      status = selectBaseStatus();
    } else {
      status = `${toolNames[t]} 도구` + (shapeTools[t] ? ' · Shift로 고정 (45°/정사각형/원)' : '');
    }
  }

  function selectColor(c: string) {
    color = c;
    engine?.setColor(c);
  }

  function setWidth(w: number) {
    width = w;
    engine?.setWidth(w);
  }

  function setFontSize(px: number) {
    fontSize = px;
    engine?.setFontSize(px);
  }

  function undo() {
    engine?.undo();
  }
  function redo() {
    engine?.redo();
  }
  function clearAll() {
    if (confirm('캔버스를 모두 지울까요?')) engine?.clear();
  }

  function insertText(v: string) {
    engine?.insertText(v);
  }

  // ---- sentence switching ----
  function resetForCurrent() {
    stopTimer();
    remaining = current.time;
    engine?.reset();
    explanation = '';
    checks = [false, false, false, false];
    feedbackShown = false;
  }

  function changeSentence(e: Event) {
    selectedIndex = Number((e.currentTarget as HTMLSelectElement).value);
    resetForCurrent();
  }

  // ---- custom passage ----
  function splitSentences(text: string): Sentence[] {
    const norm = text.replace(/\s+/g, ' ').trim();
    if (!norm) return [];
    const parts = norm.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [];
    return parts
      .map((p, i) => ({ text: p.trim(), pattern: `문장 ${i + 1}`, level: '-', time: 40 }))
      .filter((s) => s.text.length > 0);
  }

  function applyCustomPassage() {
    const parsed = splitSentences(customText);
    if (!parsed.length) {
      alert('문장을 찾을 수 없습니다. 마침표(.)로 끝나는 영어 문장을 붙여넣어 주세요.');
      return;
    }
    isCustom = true;
    sentences = parsed;
    activePassage = { title: '내 지문', text: customText.replace(/\s+/g, ' ').trim(), summary: '' };
    selectedIndex = 0;
    resetForCurrent();
    customOpen = false;
  }

  function restoreDefaultPassage() {
    isCustom = false;
    sentences = sentenceData;
    activePassage = passage;
    selectedIndex = 0;
    resetForCurrent();
    customOpen = false;
  }

  // ---- self-check ----
  const messages = [
    '원문을 다시 읽고 중심 대상 하나만 먼저 크게 적어 보세요.',
    '핵심 대상은 찾았습니다. 이제 화살표로 영향의 방향을 추가해 보세요.',
    '관계가 보이기 시작했습니다. 조건이나 반전이 그림에 빠지지 않았는지 확인하세요.',
    '핵심 관계가 잘 드러납니다. 그림을 보지 않고 한 문장으로 설명해 보세요.',
    '좋습니다. 그림, 방향, 조건, 자기 설명이 모두 연결되었습니다.',
  ];

  function diagnose() {
    const n = checks.filter(Boolean).length;
    feedbackText = messages[n];
    feedbackShown = true;
  }

  // ---- exports ----
  function savePng() {
    if (!engine) return;
    const a = document.createElement('a');
    a.download = '관계스케칭.png';
    a.href = engine.exportPNGDataURL();
    a.click();
  }

  function saveJson() {
    if (!engine) return;
    const record = {
      savedAt: new Date().toISOString(),
      sentence: current.text,
      pattern: current.pattern,
      level: current.level,
      explanation: explanation.trim(),
      checklist: {
        coreTarget: checks[0],
        relationDirection: checks[1],
        conditionShift: checks[2],
        selfExplanation: checks[3],
      },
      sketchDataUrl: engine.toDataURL(),
      sketchMarks: engine.getMarks(),
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '관계스케칭_학습기록.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---- import a saved learning record ----
  let fileInput: HTMLInputElement;

  function triggerLoad() {
    fileInput?.click();
  }

  async function onLoadFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const marks: unknown = data.sketchMarks ?? data.marks ?? (Array.isArray(data) ? data : null);
      if (typeof data.sentence === 'string') {
        const i = sentences.findIndex((s) => s.text === data.sentence);
        if (i >= 0) {
          selectedIndex = i;
          stopTimer();
          remaining = sentences[i].time;
        }
      }
      if (typeof data.explanation === 'string') explanation = data.explanation;
      if (data.checklist) {
        checks = [
          !!data.checklist.coreTarget,
          !!data.checklist.relationDirection,
          !!data.checklist.conditionShift,
          !!data.checklist.selfExplanation,
        ];
      }
      feedbackShown = false;
      if (Array.isArray(marks)) engine?.loadMarks(marks as Mark[]);
    } catch {
      alert('불러올 수 없는 파일입니다. (JSON 학습 기록만 지원)');
    } finally {
      input.value = '';
    }
  }

  // ---- keyboard shortcuts (undo/redo) ----
  function handleKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT');

    // Delete selected mark (select tool) with Delete / Backspace.
    if (!typing && tool === 'select' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      engine?.deleteSelected();
      return;
    }

    if (!(e.ctrlKey || e.metaKey)) return;
    if (typing) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((k === 'z' && e.shiftKey) || k === 'y') {
      e.preventDefault();
      redo();
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

<main class="app">
  <aside class="panel sidebar">
    <div class="brand">
      <h1>직관적 관계 스케칭</h1>
      <p>번역문을 적기보다, 문장 속 관계와 변화를 단어·선·기호·공간 배치로 표현하세요.</p>
    </div>

    <section class="section">
      <div class="section-title">기본 지문{isCustom ? ' · 내 지문' : ''}</div>
      <div class="grid2">
        <button class="btn" type="button" onclick={() => (passageOpen = !passageOpen)}>
          {passageOpen ? '지문 닫기' : '지문 보기'}
        </button>
        <button class="btn" type="button" onclick={() => (customOpen = !customOpen)}>
          {customOpen ? '입력 닫기' : '내 지문 입력'}
        </button>
      </div>
      <div class="hint-box" class:show={passageOpen} style="margin-top:8px">
        <strong>{activePassage.title}</strong>
        <p style="margin:8px 0 0;line-height:1.75">{activePassage.text}</p>
        {#if activePassage.summary}
          <p style="margin:10px 0 0;padding-top:10px;border-top:1px solid var(--line)">핵심: {activePassage.summary}</p>
        {/if}
      </div>
      <div class="hint-box" class:show={customOpen} style="margin-top:8px">
        <textarea
          bind:value={customText}
          placeholder="영어 지문을 붙여넣으세요. 마침표(.)·물음표(?)·느낌표(!) 단위로 문장이 자동 분리됩니다."
          style="min-height:120px"
        ></textarea>
        <div class="grid2" style="margin-top:8px">
          <button class="btn primary" type="button" onclick={applyCustomPassage}>적용</button>
          <button class="btn" type="button" onclick={restoreDefaultPassage}>기본 지문으로</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">1. 문장 선택</div>
      <select aria-label="연습 문장 선택" value={selectedIndex} onchange={changeSentence}>
        {#each sentences as s, i (i)}
          <option value={i}>{i + 1}. {s.pattern}</option>
        {/each}
      </select>
      <div class="sentence-card" style="margin-top:10px">{current.text}</div>
      <div class="meta-row" style="margin-top:10px">
        <span class="pill">{current.pattern}</span>
        <span class="pill">난이도 {current.level}</span>
      </div>
    </section>

    <section class="section">
      <div class="section-title">2. 먼저 직관으로 그리기</div>
      <div class="meta-row" style="justify-content:space-between">
        <span class="timer">{timerLabel}</span>
        <div>
          <button class="btn small" type="button" onclick={toggleTimer}>
            {timerRunning ? '일시정지' : '시작'}
          </button>
          <button class="btn small" type="button" onclick={resetTimer}>초기화</button>
        </div>
      </div>
      <p style="font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:0">
        처음에는 도움 없이 40초 동안 핵심어와 관계만 빠르게 표현하세요.
      </p>
    </section>

    <section class="section">
      <div class="section-title">3. 막힐 때만 질문 보기</div>
      <button class="btn" type="button" style="width:100%" onclick={() => (hintOpen = !hintOpen)}>
        {hintOpen ? '사고 유도 질문 닫기' : '사고 유도 질문 열기'}
      </button>
      <div class="hint-box" class:show={hintOpen} style="margin-top:8px">
        <strong>정답 그림은 없습니다.</strong><br />
        · 무엇이 중심 대상인가?<br />
        · 무엇이 커지거나 작아지는가?<br />
        · 무엇이 무엇에 영향을 미치는가?<br />
        · 처음과 나중의 상태가 같은가?<br />
        · 조건이나 반전은 어디에 있는가?<br />
        · 이 문장은 지문 전체에서 어떤 역할을 하는가?
      </div>
    </section>

    <section class="section">
      <div class="section-title">4. 내 그림을 말로 설명하기</div>
      <label for="explanation">내가 그린 관계</label>
      <textarea
        id="explanation"
        bind:value={explanation}
        placeholder="예: 기술은 처음에는 인간의 판단을 돕지만, 의존이 커지면 오히려 그 판단을 대신한다."
      ></textarea>
    </section>

    <section class="section">
      <div class="section-title">5. 원문을 다시 보고 점검하기</div>
      <div class="checklist">
        <label class="check-row"><input type="checkbox" bind:checked={checks[0]} /> 핵심 대상이 표현되어 있다.</label>
        <label class="check-row"><input type="checkbox" bind:checked={checks[1]} /> 관계의 방향이 맞다.</label>
        <label class="check-row"><input type="checkbox" bind:checked={checks[2]} /> 조건·반전·시간 변화가 반영되어 있다.</label>
        <label class="check-row"><input type="checkbox" bind:checked={checks[3]} /> 내 그림을 말로 설명할 수 있다.</label>
      </div>
      <button class="btn primary" type="button" style="width:100%;margin-top:10px" onclick={diagnose}>
        자기 점검 결과 보기
      </button>
      <div class="feedback" class:show={feedbackShown} style="margin-top:8px">{feedbackText}</div>
    </section>

    <section class="section">
      <div class="grid2">
        <button class="btn" type="button" onclick={savePng}>PNG 저장</button>
        <button class="btn" type="button" onclick={saveJson}>학습 기록 저장</button>
      </div>
      <button class="btn" type="button" style="width:100%;margin-top:8px" onclick={triggerLoad}>학습 기록 불러오기</button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        style="display:none"
        onchange={onLoadFile}
      />
    </section>
  </aside>

  <section class="workspace">
    <Toolbar
      {tool}
      {color}
      {width}
      {fontSize}
      {canUndo}
      {canRedo}
      onTool={selectTool}
      onColor={selectColor}
      onWidth={setWidth}
      onFontSize={setFontSize}
      onUndo={undo}
      onRedo={redo}
      onClear={clearAll}
    />

    <CanvasBoard {onReady} {onHistoryChange} {onTextRequest} {onSelectionChange} {onChange} />

    <div class="panel statusbar">
      <span>{status}</span>
      <span><span class="kbd">Ctrl</span> + <span class="kbd">Z</span> 실행 취소</span>
    </div>
  </section>
</main>

<TextDialog bind:open={textOpen} onInsert={insertText} />
