// 発行した短縮 token の履歴を localStorage に保存する。
// 認証がないため、共有 PC で誰かの履歴に他人が混ざるリスクは cookie/localStorage
// どちらでも同じ。サーバ側での参照は不要なので localStorage で足りる。
// PII (氏名・期) が入るため、30 日自動失効と手動削除の 2 系統で最小限に絞る。

const HISTORY_KEY = 'ig-goal-sheet-2026-10-v2-tokens';
const MAX_ENTRIES = 50;
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 日

export type HistoryKind = 'self' | 'supervisor';

export interface TokenHistoryEntry {
  token: string;
  name: string;
  period: string;
  kind: HistoryKind;
  createdAt: number;
}

function safeRead(): TokenHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is TokenHistoryEntry =>
        e && typeof e.token === 'string' && typeof e.createdAt === 'number',
    );
  } catch {
    return [];
  }
}

function safeWrite(entries: TokenHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // storage 満杯・privacy モード等では諦める
  }
}

/**
 * 30 日を超えたエントリを除去した現在の履歴を返す。read 時に必ず通し、
 * 期限切れが混ざったまま返さないようにする（自動失効の一次実装）。
 */
export function readTokenHistory(): TokenHistoryEntry[] {
  const now = Date.now();
  const all = safeRead();
  const fresh = all.filter(e => now - e.createdAt < EXPIRY_MS);
  if (fresh.length !== all.length) {
    // 副作用として storage も掃除する（次回以降のロード軽量化）
    safeWrite(fresh);
  }
  return fresh.sort((a, b) => b.createdAt - a.createdAt);
}

export function appendTokenHistory(entry: Omit<TokenHistoryEntry, 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  const current = safeRead();
  // 同一 token は上書き（新しい createdAt に更新）
  const filtered = current.filter(e => e.token !== entry.token);
  filtered.unshift({ ...entry, createdAt: Date.now() });
  const trimmed = filtered.slice(0, MAX_ENTRIES);
  safeWrite(trimmed);
}

/** 個別削除。UI の「削除」ボタンから呼ぶ。 */
export function removeTokenHistory(token: string): void {
  if (typeof window === 'undefined') return;
  const filtered = safeRead().filter(e => e.token !== token);
  safeWrite(filtered);
}

/** 全消し。UI の「履歴を全削除」ボタンから呼ぶ。 */
export function clearTokenHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // 諦める
  }
}

