export type Tool = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface EngineCallbacks {
  /** Called when undo/redo availability changes, so the UI can enable/disable buttons. */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** Called when the text tool is used, so the UI can open the text-input dialog. */
  onTextRequest?: (point: Point) => void;
}

/**
 * Framework-free raster sketch engine, ported from the original single-file app.
 * Snapshots for shape preview and undo/redo are synchronous off-screen canvas
 * copies, so restoring a previous state never races an async Image load.
 */
export class SketchEngine {
  tool: Tool = 'pen';
  color = '#172033';
  width = 3;

  private canvas: HTMLCanvasElement;
  private wrap: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  private drawing = false;
  private start: Point = { x: 0, y: 0 };
  private previewSnap: HTMLCanvasElement | null = null;
  private pendingTextPoint: Point | null = null;

  private undoStack: HTMLCanvasElement[] = [];
  private redoStack: HTMLCanvasElement[] = [];
  private readonly UNDO_LIMIT = 30;

  private cb: EngineCallbacks;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, wrap: HTMLElement, cb: EngineCallbacks = {}) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.cb = cb;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.resizeCanvas();
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(wrap);

    canvas.addEventListener('pointerdown', this.begin);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.end);
    canvas.addEventListener('pointercancel', this.end);

    this.emitHistory();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.begin);
    this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.end);
    this.canvas.removeEventListener('pointercancel', this.end);
  }

  // ---- public API ----------------------------------------------------------

  setTool(t: Tool) {
    this.tool = t;
  }
  setColor(c: string) {
    this.color = c;
  }
  setWidth(w: number) {
    this.width = w;
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.cloneCanvas());
    this.paintCanvas(this.undoStack.pop()!);
    this.emitHistory();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.cloneCanvas());
    this.paintCanvas(this.redoStack.pop()!);
    this.emitHistory();
  }

  /** Toolbar "clear all": undoable. */
  clear() {
    this.pushUndo();
    const r = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, r.width, r.height);
  }

  /** Full reset (e.g. when switching sentence): wipes canvas and history. */
  reset() {
    const r = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, r.width, r.height);
    this.undoStack = [];
    this.redoStack = [];
    this.emitHistory();
  }

  /** Commit text from the dialog at the point captured on the last text-tool click. */
  insertText(value: string) {
    const v = value.trim();
    if (!v || !this.pendingTextPoint) return;
    this.pushUndo();
    this.ctx.fillStyle = this.color;
    this.ctx.font = `${Math.max(16, this.width * 5)}px Inter, Pretendard, sans-serif`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(v, this.pendingTextPoint.x, this.pendingTextPoint.y);
    this.pendingTextPoint = null;
  }

  /** Raw data URL of the current canvas, for the JSON learning record. */
  toDataURL(): string {
    return this.canvas.toDataURL();
  }

  /** 2x, white-background PNG data URL for the "PNG 저장" export. */
  exportPNGDataURL(): string {
    const r = this.canvas.getBoundingClientRect();
    const ex = document.createElement('canvas');
    ex.width = Math.floor(r.width * 2);
    ex.height = Math.floor(r.height * 2);
    const g = ex.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, ex.width, ex.height);
    g.drawImage(this.canvas, 0, 0, ex.width, ex.height);
    return ex.toDataURL('image/png');
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  // ---- internals -----------------------------------------------------------

  private emitHistory() {
    this.cb.onHistoryChange?.(this.canUndo, this.canRedo);
  }

  private resizeCanvas() {
    const rect = this.wrap.getBoundingClientRect();
    const old = document.createElement('canvas');
    old.width = this.canvas.width;
    old.height = this.canvas.height;
    old.getContext('2d')!.drawImage(this.canvas, 0, 0);
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (old.width && old.height) {
      this.ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, rect.width, rect.height);
    }
  }

  private pointFromEvent(e: PointerEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Synchronous off-screen device-pixel copy of the current canvas. */
  private cloneCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    if (c.width && c.height) c.getContext('2d')!.drawImage(this.canvas, 0, 0);
    return c;
  }

  /** Paint an off-screen copy back onto the live canvas under the current transform. */
  private paintCanvas(src: HTMLCanvasElement) {
    const r = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, r.width, r.height);
    if (src && src.width && src.height) {
      this.ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, r.width, r.height);
    }
  }

  private pushUndo() {
    this.undoStack.push(this.cloneCanvas());
    if (this.undoStack.length > this.UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.emitHistory();
  }

  /** Hold Shift to constrain: lines/arrows snap to 45°, boxes/ellipses become square/circle. */
  private constrainPoint(a: Point, b: Point): Point {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (this.tool === 'line' || this.tool === 'arrow') {
      const dist = Math.hypot(dx, dy);
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      return { x: a.x + dist * Math.cos(ang), y: a.y + dist * Math.sin(ang) };
    }
    if (this.tool === 'rect' || this.tool === 'ellipse') {
      const s = Math.max(Math.abs(dx), Math.abs(dy));
      return { x: a.x + (dx < 0 ? -s : s), y: a.y + (dy < 0 ? -s : s) };
    }
    return b;
  }

  private begin = (e: PointerEvent) => {
    if (this.tool === 'text') {
      this.pendingTextPoint = this.pointFromEvent(e);
      this.cb.onTextRequest?.(this.pendingTextPoint);
      return;
    }
    this.drawing = true;
    this.start = this.pointFromEvent(e);
    this.previewSnap = this.cloneCanvas();
    this.pushUndo();
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.tool === 'eraser' ? Math.max(14, this.width * 4) : this.width;
    if (this.tool === 'pen' || this.tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(this.start.x, this.start.y);
    }
    this.canvas.setPointerCapture(e.pointerId);
  };

  private move = (e: PointerEvent) => {
    if (!this.drawing) return;
    const p = this.pointFromEvent(e);
    if (this.tool === 'pen' || this.tool === 'eraser') {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      const q = e.shiftKey ? this.constrainPoint(this.start, p) : p;
      if (this.previewSnap) this.paintCanvas(this.previewSnap);
      this.drawShape(this.start, q);
    }
  };

  private end = (e: PointerEvent) => {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.tool !== 'pen' && this.tool !== 'eraser') {
      const p = this.pointFromEvent(e);
      const q = e.shiftKey ? this.constrainPoint(this.start, p) : p;
      if (this.previewSnap) this.paintCanvas(this.previewSnap);
      this.drawShape(this.start, q);
    }
  };

  private drawShape(a: Point, b: Point) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (this.tool === 'line') {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else if (this.tool === 'arrow') {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = 12 + this.width * 1.5;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 7), b.y - head * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 7), b.y - head * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
    } else if (this.tool === 'rect') {
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (this.tool === 'ellipse') {
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rx = Math.abs(b.x - a.x) / 2;
      const ry = Math.abs(b.y - a.y) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
