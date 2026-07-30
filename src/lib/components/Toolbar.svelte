<script lang="ts">
  import type { Tool } from '../canvas/engine';

  let {
    tool,
    color,
    width,
    canUndo,
    canRedo,
    onTool,
    onColor,
    onWidth,
    onUndo,
    onRedo,
    onClear,
  }: {
    tool: Tool;
    color: string;
    width: number;
    canUndo: boolean;
    canRedo: boolean;
    onTool: (t: Tool) => void;
    onColor: (c: string) => void;
    onWidth: (w: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
  } = $props();

  const tools: { id: Tool; label: string; title: string }[] = [
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

  <div class="tool-group">
    <button class="btn small" type="button" disabled={!canUndo} onclick={onUndo}>실행 취소</button>
    <button class="btn small" type="button" disabled={!canRedo} onclick={onRedo}>다시 실행</button>
    <button class="btn small danger" type="button" onclick={onClear}>전체 지우기</button>
  </div>
</div>
