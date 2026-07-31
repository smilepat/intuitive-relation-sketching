<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SketchEngine, type Point } from '../canvas/engine';

  let {
    onReady,
    onHistoryChange,
    onTextRequest,
    onSelectionChange,
  }: {
    onReady: (engine: SketchEngine) => void;
    onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
    onTextRequest: (point: Point) => void;
    onSelectionChange: (hasSelection: boolean) => void;
  } = $props();

  let wrapEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let engine: SketchEngine | undefined;

  onMount(() => {
    engine = new SketchEngine(canvasEl, wrapEl, { onHistoryChange, onTextRequest, onSelectionChange });
    onReady(engine);
  });

  onDestroy(() => engine?.destroy());
</script>

<div class="panel canvas-panel" bind:this={wrapEl}>
  <canvas id="board" bind:this={canvasEl} aria-label="직관적 관계 스케칭 캔버스"></canvas>
  <div class="canvas-help">
    핵심어는 크게, 조건은 주변에, 원인과 결과는 선과 방향으로 표현해 보세요.
  </div>
</div>
