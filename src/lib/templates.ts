import type { Mark, Point } from './canvas/engine';

export interface TemplateSlot {
  key: string;
  label: string;
  placeholder?: string;
}

export interface TemplateDef {
  id: string;
  title: string;
  hint: string;
  slots: TemplateSlot[];
}

/** Relationship templates matching the app's pattern taxonomy. */
export const templates: TemplateDef[] = [
  {
    id: 'cause',
    title: '원인 → 결과',
    hint: 'A가 B를 일으킨다',
    slots: [
      { key: 'a', label: '원인 (A)', placeholder: '예: 지시만 따름' },
      { key: 'b', label: '결과 (B)', placeholder: '예: 빨리 도착' },
    ],
  },
  {
    id: 'contrast',
    title: '대조 (A ↔ B)',
    hint: '두 대상이 서로 대비된다',
    slots: [
      { key: 'a', label: 'A', placeholder: '예: 빠른 도달' },
      { key: 'b', label: 'B', placeholder: '예: 판단력 약화' },
    ],
  },
  {
    id: 'condition',
    title: '조건 (if A ⇢ B)',
    hint: 'A라는 조건이면 B',
    slots: [
      { key: 'a', label: '조건 (if A)', placeholder: '예: 안내를 계속 받으면' },
      { key: 'b', label: '결과 (then B)', placeholder: '예: 스스로 판단 못함' },
    ],
  },
  {
    id: 'change',
    title: '증감 (A ↑ / B ↓)',
    hint: '한쪽은 늘고 한쪽은 준다',
    slots: [
      { key: 'a', label: '증가 (A ↑)', placeholder: '예: 의존' },
      { key: 'b', label: '감소 (B ↓)', placeholder: '예: 판단력' },
    ],
  },
  {
    id: 'sequence',
    title: '순서 (A → B → C)',
    hint: '차례로 이어지는 흐름',
    slots: [
      { key: 'a', label: 'A', placeholder: '예: 길을 잃음' },
      { key: 'b', label: 'B', placeholder: '예: 대안 비교' },
      { key: 'c', label: 'C', placeholder: '예: 실수 교정' },
    ],
  },
];

export interface BuildOptions {
  origin: Point; // top-left-ish anchor
  fontSize: number;
  color: string;
  width: number;
}

/** Rough label width without a canvas context (good enough for initial layout). */
function textWidth(t: string, size: number): number {
  return Math.max(size * 1.6, t.length * size * 0.62);
}

/**
 * Compile a filled-in template into vector marks (text + arrows/lines only, v1).
 * The result is a starting arrangement the student is expected to reposition.
 */
export function buildTemplate(id: string, values: Record<string, string>, opts: BuildOptions): Mark[] {
  const { fontSize: size, color, width } = opts;
  const marks: Mark[] = [];
  const gap = 64;
  const mid = size / 2;

  const text = (t: string, x: number, y: number): Mark => ({ kind: 'text', color, width, at: { x, y }, text: t, size });
  const arrow = (a: Point, b: Point): Mark => ({ kind: 'arrow', color, width, a, b });
  const line = (a: Point, b: Point): Mark => ({ kind: 'line', color, width, a, b });

  /** Lay out labels left-to-right joined by a connector; returns the marks. */
  function chain(labels: string[], y: number, connector: 'arrow' | 'line'): Mark[] {
    const out: Mark[] = [];
    let x = opts.origin.x;
    labels.forEach((label, i) => {
      const w = textWidth(label, size);
      out.push(text(label, x, y));
      if (i < labels.length - 1) {
        const from = { x: x + w + 10, y: y + mid };
        const to = { x: x + w + 10 + gap - 12, y: y + mid };
        out.push(connector === 'arrow' ? arrow(from, to) : line(from, to));
      }
      x += w + 10 + gap;
    });
    return out;
  }

  const a = (values.a ?? '').trim() || 'A';
  const b = (values.b ?? '').trim() || 'B';
  const c = (values.c ?? '').trim() || 'C';
  const y0 = opts.origin.y;

  switch (id) {
    case 'cause':
      marks.push(...chain([a, b], y0, 'arrow'));
      break;
    case 'sequence':
      marks.push(...chain([a, b, c], y0, 'arrow'));
      break;
    case 'contrast': {
      const row = chain([a, b], y0, 'line');
      marks.push(...row);
      // "↔" above the connecting line's midpoint
      const wA = textWidth(a, size);
      const lineMidX = opts.origin.x + wA + 10 + (gap - 12) / 2;
      marks.push(text('↔', lineMidX - size * 0.4, y0 - size));
      break;
    }
    case 'condition': {
      marks.push(text('조건', opts.origin.x, y0));
      marks.push(...chain([a, b], y0 + size + 14, 'arrow'));
      break;
    }
    case 'change': {
      const wA = textWidth(a, size);
      marks.push(text(a, opts.origin.x, y0));
      marks.push(text('↑', opts.origin.x + wA + 8, y0));
      const y2 = y0 + size + 16;
      const wB = textWidth(b, size);
      marks.push(text(b, opts.origin.x, y2));
      marks.push(text('↓', opts.origin.x + wB + 8, y2));
      break;
    }
    default:
      break;
  }

  return marks;
}

/** Suggest a template category from a sentence's pattern string (no slot pre-fill). */
export function suggestTemplateId(pattern: string): string {
  const p = pattern ?? '';
  if (p.includes('↔') || p.includes('반전') || p.includes('대조')) return 'contrast';
  if (p.includes('↑') || p.includes('↓') || p.includes('증') || p.includes('감')) return 'change';
  if (p.includes('조건') || /if/i.test(p)) return 'condition';
  if ((p.match(/→/g)?.length ?? 0) >= 2) return 'sequence';
  if (p.includes('→')) return 'cause';
  return 'cause';
}
