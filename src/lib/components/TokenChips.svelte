<script lang="ts">
  let {
    text,
    onPlaceAuto,
    onDropClient,
  }: {
    text: string;
    onPlaceAuto: (label: string) => void;
    onDropClient: (label: string, clientX: number, clientY: number) => void;
  } = $props();

  function tokenize(t: string): string[] {
    return t
      .split(/\s+/)
      .map((w) => w.replace(/^[^\p{L}\p{N}↑↓↔→]+|[^\p{L}\p{N}↑↓↔→]+$/gu, ''))
      .filter((w) => w.length > 0);
  }

  const tokens = $derived(tokenize(text));

  // phrase buffer (Shift+click / Shift+Enter to add several words, then place)
  let phrase = $state<string[]>([]);
  $effect(() => {
    // clear the buffer whenever the sentence changes
    text;
    phrase = [];
  });

  // pointer drag state
  let dragW = $state<string | null>(null);
  let startX = 0;
  let startY = 0;
  let moved = $state(false);
  let ghostX = $state(0);
  let ghostY = $state(0);
  const ghostText = $derived(dragW ?? '');

  function down(e: PointerEvent, w: string) {
    if (e.shiftKey) {
      phrase = [...phrase, w];
      return;
    }
    dragW = w;
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    ghostX = e.clientX;
    ghostY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent) {
    if (dragW === null) return;
    ghostX = e.clientX;
    ghostY = e.clientY;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) moved = true;
  }

  function up(e: PointerEvent) {
    if (dragW === null) return;
    const w = dragW;
    dragW = null;
    if (moved) onDropClient(w, e.clientX, e.clientY);
    else onPlaceAuto(w);
    moved = false;
  }

  function keydown(e: KeyboardEvent, w: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.shiftKey) phrase = [...phrase, w];
      else onPlaceAuto(w);
    }
  }

  function placePhrase() {
    if (phrase.length) {
      onPlaceAuto(phrase.join(' '));
      phrase = [];
    }
  }
</script>

<div class="panel chips">
  <span class="chips-label">문장 단어</span>
  <div class="chips-row">
    {#each tokens as w, i (i)}
      <button
        class="chip"
        type="button"
        title="클릭: 배치 · 드래그: 원하는 곳에 놓기 · Shift+클릭: 구절 만들기"
        onpointerdown={(e) => down(e, w)}
        onpointermove={move}
        onpointerup={up}
        onkeydown={(e) => keydown(e, w)}>{w}</button
      >
    {/each}
  </div>

  {#if phrase.length}
    <div class="phrase">
      <span class="phrase-text">{phrase.join(' ')}</span>
      <button class="btn small primary" type="button" onclick={placePhrase}>구절 배치</button>
      <button class="btn small" type="button" onclick={() => (phrase = [])}>취소</button>
    </div>
  {/if}
</div>

{#if dragW !== null && moved}
  <div class="chip-ghost" style="left:{ghostX + 8}px;top:{ghostY + 8}px">{ghostText}</div>
{/if}

<style>
  .chips {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .chips-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
  }
  .chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 72px;
    overflow: auto;
  }
  .chip {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 999px;
    padding: 5px 11px;
    font-size: 13px;
    color: var(--ink);
    line-height: 1.2;
    touch-action: none;
  }
  .chip:hover {
    background: var(--accent-soft);
    border-color: #b8c4ff;
  }
  .phrase {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }
  .phrase-text {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
  }
  .chip-ghost {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    background: var(--accent);
    color: #fff;
    border-radius: 8px;
    padding: 4px 8px;
    font-size: 13px;
    box-shadow: 0 6px 18px rgba(20, 28, 45, 0.25);
  }
</style>
