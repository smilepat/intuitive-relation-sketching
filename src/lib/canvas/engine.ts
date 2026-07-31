export type Tool = 'select' | 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser' | 'stamp';

const KNOWN_KINDS = new Set(['pen', 'eraser', 'line', 'arrow', 'rect', 'ellipse', 'text']);

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A single drawn element. The marks array is the source of truth; the canvas
 *  is always a pure render of it, which makes undo/redo structural and resize
 *  a crisp re-render instead of a bitmap rescale. */
export type Mark =
  | { kind: 'pen' | 'eraser'; color: string; width: number; points: Point[] }
  | { kind: 'line' | 'arrow' | 'rect' | 'ellipse'; color: string; width: number; a: Point; b: Point }
  | { kind: 'text'; color: string; width: number; at: Point; text: string; size?: number };

export interface EngineCallbacks {
  /** Called when undo/redo availability changes, so the UI can enable/disable buttons. */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /** Called when the text tool is used, so the UI can open the text-input dialog. */
  onTextRequest?: (point: Point) => void;
  /** Called when the selection changes (select tool), so the UI can hint/enable delete. */
  onSelectionChange?: (hasSelection: boolean) => void;
  /** Called after any change to the marks (draw, move, delete, undo/redo, load), for autosave. */
  onChange?: () => void;
}

/**
 * Vector sketch engine. All committed marks live in `marks`; the visible canvas
 * is a render of that list. During a drag, committed marks are cached to an
 * off-screen base canvas and the in-progress mark is drawn on top, so preview
 * never races an async load. Undo/redo snapshot the (small) marks list.
 */
export class SketchEngine {
  tool: Tool = 'pen';
  color = '#172033';
  width = 3;
  fontSize = 20;
  stampValue = '';

  private canvas: HTMLCanvasElement;
  private wrap: HTMLElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(1, window.devicePixelRatio || 1);

  private marks: Mark[] = [];
  private base: HTMLCanvasElement = document.createElement('canvas');
  private autoCursor: Point = { x: 44, y: 44 };

  private drawing = false;
  private start: Point = { x: 0, y: 0 };
  private currentMark: Mark | null = null;
  private pendingTextPoint: Point | null = null;

  // selection / move (select tool)
  private selectedIndex: number | null = null;
  private selDragging = false;
  private dragStart: Point = { x: 0, y: 0 };
  private origSelected: Mark | null = null;
  private preDragMarks: Mark[] | null = null;
  private didMove = false;

  private undoStack: Mark[][] = [];
  private redoStack: Mark[][] = [];
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
    if (t !== 'select') this.setSelection(null);
  }

  /** Delete the currently selected mark (select tool). */
  deleteSelected() {
    if (this.selectedIndex === null) return;
    this.pushUndo();
    this.marks.splice(this.selectedIndex, 1);
    this.setSelection(null);
    this.present();
    this.changed();
  }

  get hasSelection() {
    return this.selectedIndex !== null;
  }

  private setSelection(i: number | null) {
    if (this.selectedIndex === i) return;
    this.selectedIndex = i;
    this.cb.onSelectionChange?.(i !== null);
  }
  setColor(c: string) {
    this.color = c;
  }
  setWidth(w: number) {
    this.width = w;
  }
  setFontSize(px: number) {
    this.fontSize = px;
  }
  setStamp(value: string) {
    this.stampValue = value;
  }

  /** Canvas center in CSS pixels — a sensible drop point for generated diagrams. */
  centerPoint(): Point {
    const { w, h } = this.cssSize();
    return { x: w / 2, y: h / 2 };
  }

  /** Place a text label at a canvas point (used by sentence-word chips). */
  placeText(text: string, at: Point) {
    const v = text.trim();
    if (!v) return;
    this.commit({ kind: 'text', color: this.color, width: this.width, at, text: v, size: this.fontSize });
  }

  /** Place text from a client (viewport) coordinate; ignored if dropped off-canvas. */
  placeTextAtClient(text: string, clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    this.placeText(text, { x, y });
  }

  /** Place text at an auto-advancing position (top-left, flowing down then right). */
  placeTextAuto(text: string) {
    const { w, h } = this.cssSize();
    this.placeText(text, { x: this.autoCursor.x, y: this.autoCursor.y });
    let ny = this.autoCursor.y + this.fontSize + 14;
    let nx = this.autoCursor.x;
    if (ny > h - 40) {
      ny = 44;
      nx = Math.min(nx + 170, Math.max(44, w - 120));
    }
    this.autoCursor = { x: nx, y: ny };
  }

  /** Append several finished marks as a single undoable step (e.g. a template). */
  commitMarks(marks: Mark[]) {
    if (!marks.length) return;
    this.pushUndo();
    for (const m of marks) this.marks.push(m);
    this.renderBase();
    this.present();
    this.changed();
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(structuredClone(this.marks));
    this.marks = this.undoStack.pop()!;
    this.setSelection(null);
    this.renderBase();
    this.present();
    this.emitHistory();
    this.changed();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(structuredClone(this.marks));
    this.marks = this.redoStack.pop()!;
    this.setSelection(null);
    this.renderBase();
    this.present();
    this.emitHistory();
    this.changed();
  }

  /** Toolbar "clear all": undoable. */
  clear() {
    this.pushUndo();
    this.marks = [];
    this.setSelection(null);
    this.renderBase();
    this.present();
    this.changed();
  }

  /** Full reset (e.g. when switching sentence): wipes marks and history. */
  reset() {
    this.marks = [];
    this.undoStack = [];
    this.redoStack = [];
    this.autoCursor = { x: 44, y: 44 };
    this.setSelection(null);
    this.renderBase();
    this.present();
    this.emitHistory();
    this.changed();
  }

  /** Commit text from the dialog at the point captured on the last text-tool click. */
  insertText(value: string) {
    const v = value.trim();
    if (!v || !this.pendingTextPoint) return;
    this.commit({ kind: 'text', color: this.color, width: this.width, at: this.pendingTextPoint, text: v, size: this.fontSize });
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
    g.setTransform(2, 0, 0, 2, 0, 0);
    this.renderMarks(g, this.marks);
    return ex.toDataURL('image/png');
  }

  /** Deep copy of the current marks (for saving / future JSON export). */
  getMarks(): Mark[] {
    return structuredClone(this.marks);
  }

  /** Replace all marks (e.g. loading a saved sketch); resets history. */
  loadMarks(marks: Mark[]) {
    this.marks = structuredClone(marks).filter((m) => m && KNOWN_KINDS.has((m as { kind?: string }).kind ?? ''));
    this.undoStack = [];
    this.redoStack = [];
    this.setSelection(null);
    this.renderBase();
    this.present();
    this.emitHistory();
    this.changed();
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

  private changed() {
    this.cb.onChange?.();
  }

  private pushUndo() {
    this.undoStack.push(structuredClone(this.marks));
    if (this.undoStack.length > this.UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.emitHistory();
  }

  /** Append a finished mark to the model (undoable) and re-render. */
  private commit(mark: Mark) {
    this.pushUndo();
    this.marks.push(mark);
    this.renderBase();
    this.present();
    this.changed();
  }

  private cssSize() {
    const r = this.canvas.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  private resizeCanvas() {
    const { w, h } = this.cssSize();
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderBase();
    this.present();
  }

  /** Render all committed marks into the off-screen base canvas at device resolution. */
  private renderBase() {
    this.base.width = this.canvas.width;
    this.base.height = this.canvas.height;
    const g = this.base.getContext('2d')!;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { w, h } = this.cssSize();
    g.clearRect(0, 0, w, h);
    this.renderMarks(g, this.marks);
  }

  /** Copy the base (committed marks) onto the live canvas. */
  private paintBase() {
    const { w, h } = this.cssSize();
    this.ctx.clearRect(0, 0, w, h);
    if (this.base.width && this.base.height) {
      this.ctx.drawImage(this.base, 0, 0, this.base.width, this.base.height, 0, 0, w, h);
    }
  }

  /** Paint committed marks plus the current selection outline. */
  private present() {
    this.paintBase();
    this.drawSelection();
  }

  private drawSelection() {
    if (this.selectedIndex === null) return;
    const m = this.marks[this.selectedIndex];
    if (!m) return;
    const r = this.markBounds(m);
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#3559e0';
    ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
  }

  // ---- hit-testing & geometry ----------------------------------------------

  private markBounds(m: Mark): Rect {
    if (m.kind === 'pen' || m.kind === 'eraser') {
      const pad = (m.kind === 'eraser' ? Math.max(14, m.width * 4) : m.width) / 2;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of m.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    }
    if (m.kind === 'text') {
      const size = m.size ?? Math.max(16, m.width * 5);
      this.ctx.font = `${size}px Inter, Pretendard, sans-serif`;
      const w = this.ctx.measureText(m.text).width;
      return { x: m.at.x, y: m.at.y, w, h: size };
    }
    // shapes (line / arrow / rect / ellipse)
    if (m.kind === 'line' || m.kind === 'arrow' || m.kind === 'rect' || m.kind === 'ellipse') {
      const minX = Math.min(m.a.x, m.b.x);
      const minY = Math.min(m.a.y, m.b.y);
      return { x: minX, y: minY, w: Math.abs(m.b.x - m.a.x), h: Math.abs(m.b.y - m.a.y) };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  private static distToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  private hitMark(p: Point, m: Mark): boolean {
    if (m.kind === 'pen' || m.kind === 'eraser') {
      const pad = Math.max(6, (m.kind === 'eraser' ? Math.max(14, m.width * 4) : m.width) / 2 + 4);
      for (let i = 1; i < m.points.length; i++) {
        if (SketchEngine.distToSegment(p, m.points[i - 1], m.points[i]) <= pad) return true;
      }
      // single-point strokes are dropped, but guard anyway
      return m.points.length === 1 && Math.hypot(p.x - m.points[0].x, p.y - m.points[0].y) <= pad;
    }
    if (m.kind === 'line' || m.kind === 'arrow') {
      return SketchEngine.distToSegment(p, m.a, m.b) <= Math.max(6, m.width + 2);
    }
    // rect / ellipse / text: hit inside the (padded) bounding box
    const r = this.markBounds(m);
    const pad = 6;
    return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  }

  /** Topmost mark under the point, or null. */
  private hitTest(p: Point): number | null {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      if (this.hitMark(p, this.marks[i])) return i;
    }
    return null;
  }

  private translatedMark(m: Mark, dx: number, dy: number): Mark {
    if (m.kind === 'pen' || m.kind === 'eraser') {
      return { ...m, points: m.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    }
    if (m.kind === 'text') {
      return { ...m, at: { x: m.at.x + dx, y: m.at.y + dy } };
    }
    if (m.kind === 'line' || m.kind === 'arrow' || m.kind === 'rect' || m.kind === 'ellipse') {
      return { ...m, a: { x: m.a.x + dx, y: m.a.y + dy }, b: { x: m.b.x + dx, y: m.b.y + dy } };
    }
    return m;
  }

  private renderMarks(ctx: CanvasRenderingContext2D, marks: Mark[]) {
    for (const m of marks) {
      ctx.globalCompositeOperation = m.kind === 'eraser' ? 'destination-out' : 'source-over';
      this.drawMark(ctx, m);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawMark(ctx: CanvasRenderingContext2D, m: Mark) {
    ctx.strokeStyle = m.color;
    ctx.fillStyle = m.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (m.kind) {
      case 'pen':
      case 'eraser': {
        ctx.lineWidth = m.kind === 'eraser' ? Math.max(14, m.width * 4) : m.width;
        const pts = m.points;
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        return;
      }
      case 'text': {
        const size = m.size ?? Math.max(16, m.width * 5);
        ctx.font = `${size}px Inter, Pretendard, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(m.text, m.at.x, m.at.y);
        return;
      }
      case 'line': {
        ctx.lineWidth = m.width;
        ctx.beginPath();
        ctx.moveTo(m.a.x, m.a.y);
        ctx.lineTo(m.b.x, m.b.y);
        ctx.stroke();
        return;
      }
      case 'arrow': {
        ctx.lineWidth = m.width;
        const angle = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x);
        const head = 12 + m.width * 1.5;
        ctx.beginPath();
        ctx.moveTo(m.a.x, m.a.y);
        ctx.lineTo(m.b.x, m.b.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(m.b.x, m.b.y);
        ctx.lineTo(m.b.x - head * Math.cos(angle - Math.PI / 7), m.b.y - head * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(m.b.x - head * Math.cos(angle + Math.PI / 7), m.b.y - head * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();
        return;
      }
      case 'rect': {
        ctx.lineWidth = m.width;
        ctx.strokeRect(m.a.x, m.a.y, m.b.x - m.a.x, m.b.y - m.a.y);
        return;
      }
      case 'ellipse': {
        ctx.lineWidth = m.width;
        const cx = (m.a.x + m.b.x) / 2;
        const cy = (m.a.y + m.b.y) / 2;
        const rx = Math.abs(m.b.x - m.a.x) / 2;
        const ry = Math.abs(m.b.y - m.a.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
    }
  }

  private pointFromEvent(e: PointerEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
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

  /** Paint the base (committed marks) then the in-progress mark on top of the live canvas. */
  private renderPreview() {
    this.paintBase();
    if (this.currentMark) {
      this.ctx.globalCompositeOperation = this.currentMark.kind === 'eraser' ? 'destination-out' : 'source-over';
      this.drawMark(this.ctx, this.currentMark);
      this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  private begin = (e: PointerEvent) => {
    if (this.tool === 'text') {
      this.pendingTextPoint = this.pointFromEvent(e);
      this.cb.onTextRequest?.(this.pendingTextPoint);
      return;
    }
    if (this.tool === 'stamp') {
      if (this.stampValue) {
        const p = this.pointFromEvent(e);
        this.commit({ kind: 'text', color: this.color, width: this.width, at: p, text: this.stampValue, size: this.fontSize });
      }
      return;
    }
    if (this.tool === 'select') {
      const p = this.pointFromEvent(e);
      const idx = this.hitTest(p);
      this.setSelection(idx);
      if (idx !== null) {
        this.selDragging = true;
        this.dragStart = p;
        this.origSelected = structuredClone(this.marks[idx]);
        this.preDragMarks = structuredClone(this.marks);
        this.didMove = false;
        this.canvas.setPointerCapture(e.pointerId);
      }
      this.present();
      return;
    }
    this.drawing = true;
    this.start = this.pointFromEvent(e);
    if (this.tool === 'pen' || this.tool === 'eraser') {
      this.currentMark = { kind: this.tool, color: this.color, width: this.width, points: [this.start] };
    } else {
      this.currentMark = { kind: this.tool, color: this.color, width: this.width, a: this.start, b: this.start };
    }
    this.canvas.setPointerCapture(e.pointerId);
  };

  private move = (e: PointerEvent) => {
    if (this.selDragging && this.selectedIndex !== null && this.origSelected) {
      const p = this.pointFromEvent(e);
      const dx = p.x - this.dragStart.x;
      const dy = p.y - this.dragStart.y;
      if (!this.didMove && (dx !== 0 || dy !== 0)) {
        this.didMove = true;
        this.undoStack.push(this.preDragMarks!);
        if (this.undoStack.length > this.UNDO_LIMIT) this.undoStack.shift();
        this.redoStack = [];
        this.emitHistory();
      }
      this.marks[this.selectedIndex] = this.translatedMark(this.origSelected, dx, dy);
      this.renderBase();
      this.present();
      return;
    }
    if (!this.drawing || !this.currentMark) return;
    const p = this.pointFromEvent(e);
    if (this.currentMark.kind === 'pen' || this.currentMark.kind === 'eraser') {
      this.currentMark.points.push(p);
    } else {
      const q = e.shiftKey ? this.constrainPoint(this.start, p) : p;
      (this.currentMark as { a: Point; b: Point }).b = q;
    }
    this.renderPreview();
  };

  private end = (e: PointerEvent) => {
    if (this.selDragging) {
      this.selDragging = false;
      this.origSelected = null;
      this.preDragMarks = null;
      if (this.didMove) this.changed();
      return;
    }
    if (!this.drawing || !this.currentMark) return;
    this.drawing = false;
    const mark = this.currentMark;
    this.currentMark = null;

    if (mark.kind === 'pen' || mark.kind === 'eraser') {
      // A click with no drag leaves no line; drop it so it makes no undo entry.
      if (mark.points.length < 2) {
        this.paintBase();
        return;
      }
    } else {
      const p = this.pointFromEvent(e);
      const q = e.shiftKey ? this.constrainPoint(this.start, p) : p;
      (mark as { a: Point; b: Point }).b = q;
    }
    this.commit(mark);
  };
}
