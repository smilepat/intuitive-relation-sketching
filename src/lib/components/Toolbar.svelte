<script lang="ts">
  import type { Tool } from '../canvas/engine';

  let {
    tool,
    color,
    width,
    fontSize,
    canUndo,
    canRedo,
    onTool,
    onColor,
    onWidth,
    onFontSize,
    onStamp,
    onTemplate,
    onUndo,
    onRedo,
    onClear,
  }: {
    tool: Tool;
    color: string;
    width: number;
    fontSize: number;
    canUndo: boolean;
    canRedo: boolean;
    onTool: (t: Tool) => void;
    onColor: (c: string) => void;
    onWidth: (w: number) => void;
    onFontSize: (px: number) => void;
    onStamp: (value: string) => void;
    onTemplate: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
  } = $props();

  // Frequent quick-memo signs — pressing one inserts it straight onto the canvas.
  const stamps = ['→', '←', '↑', '↓', '↔', '⇒', '=', '≠', '+', '−', '×', '?', '!', '∴', '✓', '★', '원인', '결과', '조건', '그러나'];

  const tools: { id: Tool; label: string; title: string }[] = [
    { id: 'select', label: '✥', title: '선택/이동' },
    { id: 'pen', label: '✎', title: '펜' },
    { id: 'line', label: '／', title: '직선' },
    { id: 'arrow', label: '→', title: '화살표' },
    { id: 'rect', label: '□', title: '상자' },
    { id: 'ellipse', label: '○', title: '원' },
    { id: 'text', label: 'T', title: '단어 입력' },
    { id: 'eraser', label: '⌫', title: '지우개' },
  ];

  const colors = [
    { v: '#172033', title: '검정' },
    { v: '#3559e0', title: '파랑' },
    { v: '#c53939', title: '빨강' },
    { v: '#2f7d4a', title: '초록' },
  ];
</script>

<div class="panel toolbar" aria-label="스케치 도구">
  <div class="tool-group">
    {#each tools as t (t.id)}
      <button
        class="tool-btn"
        class:active={tool === t.id}
        type="button"
        title={t.title}
        onclick={() => onTool(t.id)}>{t.label}</button
      >
    {/each}
  </div>

  <div class="tool-group" aria-label="색상">
    {#each colors as c (c.v)}
      <button
        class="color"
        class:active={color === c.v}
        style="background:{c.v}"
        type="button"
        title={c.title}
        aria-label={c.title}
        onclick={() => onColor(c.v)}
      ></button>
    {/each}
  </div>

  <div class="tool-group range-wrap">
    <label for="widthRange" style="margin:0">굵기</label>
    <input
      id="widthRange"
      type="range"
      min="1"
      max="12"
      value={width}
      oninput={(e) => onWidth(Number(e.currentTarget.value))}
    />
  </div>

  <div class="tool-group range-wrap">
    <label for="fontRange" style="margin:0">글자</label>
    <input
      id="fontRange"
      type="range"
      min="12"
      max="60"
      value={fontSize}
      oninput={(e) => onFontSize(Number(e.currentTarget.value))}
    />
    <span style="font-size:12px;color:var(--muted);min-width:34px">{fontSize}px</span>
  </div>

  <div class="tool-group">
    <button class="btn small" type="button" disabled={!canUndo} onclick={onUndo}>실행 취소</button>
    <button class="btn small" type="button" disabled={!canRedo} onclick={onRedo}>다시 실행</button>
    <button class="btn small danger" type="button" onclick={onClear}>전체 지우기</button>
  </div>

  <div class="tool-group" aria-label="기호 삽입">
    {#each stamps as s (s)}
      <button
        class="tool-btn"
        type="button"
        title={"'" + s + "' 삽입 (선택 도구로 이동)"}
        style="min-width:34px;height:34px;font-size:14px"
        onclick={() => onStamp(s)}>{s}</button
      >
    {/each}
  </div>

  <div class="tool-group">
    <button class="btn small" type="button" onclick={onTemplate}>관계 템플릿</button>
  </div>
</div>
