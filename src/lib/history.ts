import type { Mark } from './canvas/engine';
import type { Passage, Sentence } from './data/passages';

export interface ChecklistState {
  coreTarget: boolean;
  relationDirection: boolean;
  conditionShift: boolean;
  selfExplanation: boolean;
}

/** One saved learning record, self-contained enough to reopen exactly. */
export interface HistoryEntry {
  id: string;
  savedAt: string;
  passageId: string; // library id or 'custom'
  passageTitle: string;
  sentence: string;
  sentenceIndex: number;
  pattern: string;
  level: string;
  explanation: string;
  checklist: ChecklistState;
  marks: Mark[];
  // present only when passageId === 'custom', so a custom set can be restored
  customPassage?: Passage;
  customSentences?: Sentence[];
}

const HISTORY_KEY = 'irs.history.v1';
const MAX_ENTRIES = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

/** Prepend an entry (newest first) and cap the list; returns the new list. */
export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const entries = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  save(entries);
  return entries;
}

export function removeHistory(id: string): HistoryEntry[] {
  const entries = loadHistory().filter((e) => e.id !== id);
  save(entries);
  return entries;
}

export function clearHistory(): HistoryEntry[] {
  save([]);
  return [];
}
