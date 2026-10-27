import LZString from 'lz-string';
import { FormData } from './types';
import { mergeFormData } from './normalize-form-data';

export function encodeFormData(data: FormData): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeFormData(encoded: string): FormData | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    // 閲覧側なので上長側 finalized はそのまま残し、期も受信 payload を尊重する。
    return mergeFormData(parsed, { forceCurrentPeriod: false, finalized: 'preserve' });
  } catch {
    return null;
  }
}

export function baseFromPathname(pathname: string): string {
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  // basePath 剥がしの対象: /share / /s/... / /pdf(/...) / /history / /api/share...
  // 追加ルートを作ったらここに含める。含めないと /history 内の相対 URL が
  // /ig-goal-sheet-2026-10-v2/history/s/xxxx のような base 重複で 404 になる。
  return trimmed.replace(/\/(share|s|history|pdf(\/[^/]+)?|api\/share)(\/.*)?$/, '');
}

// URL の末尾に ?n=<name> / &n=<name> を足す。name は raw CJK を保ったまま載せる
// （encodeURIComponent すると Slack / メールで %E4%BD%90... と汚れるため）。URL 構文を
// 壊す ? / & / # / 空白だけ _ に置換する。name 空のときは URL をそのまま返す。
function appendNameHint(url: string, name?: string): string {
  if (!name) return url;
  const trimmed = name.trim();
  if (!trimmed) return url;
  const slug = trimmed.replace(/[?&#\s]+/g, '_');
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}n=${slug}`;
}

export function buildLongShareUrl(origin: string, pathname: string, encoded: string, name?: string): string {
  return appendNameHint(`${origin}${baseFromPathname(pathname)}/share?d=${encoded}`, name);
}

export function buildShortShareUrl(origin: string, pathname: string, token: string, name?: string): string {
  return appendNameHint(`${origin}${baseFromPathname(pathname)}/s/${token}`, name);
}
