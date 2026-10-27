'use client';

import { useEffect, useState } from 'react';
import {
  readTokenHistory,
  removeTokenHistory,
  clearTokenHistory,
  TokenHistoryEntry,
} from '@/lib/token-history';
import { baseFromPathname } from '@/lib/share-codec';

const KIND_LABEL: Record<TokenHistoryEntry['kind'], string> = {
  self: '本人発行',
  supervisor: '上長コメント付き',
};

function fmt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<TokenHistoryEntry[] | null>(null);
  const [base, setBase] = useState('');

  useEffect(() => {
    setEntries(readTokenHistory());
    setBase(baseFromPathname(window.location.pathname));
  }, []);

  const handleRemove = (token: string, name: string) => {
    if (!confirm(`「${name || '（未入力）'}」の履歴を削除しますか？（発行済み URL 自体は残りますが、この一覧から消えます）`)) return;
    removeTokenHistory(token);
    setEntries(readTokenHistory());
  };

  const handleClearAll = () => {
    if (!confirm('履歴を全て削除しますか？（発行済み URL 自体は残りますが、この一覧から全て消えます）')) return;
    clearTokenHistory();
    setEntries(readTokenHistory());
  };

  return (
    <>
      <div className="scene-bg" />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <header
          style={{
            padding: '32px 48px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--glass-dark)',
              backdropFilter: 'var(--glass-blur-lg)',
              WebkitBackdropFilter: 'var(--glass-blur-lg)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://app.instyle.group/_shared/static/logo.svg"
                alt="INSTYLE GROUP"
                style={{ height: 10, marginBottom: 10, filter: 'brightness(0) invert(1)', opacity: 0.45 }}
              />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-inv)', letterSpacing: '-.02em', marginBottom: 4 }}>
                発行履歴
              </h1>
              <p style={{ fontSize: '.8125rem', color: 'rgba(243,241,238,.55)' }}>
                このブラウザで発行した短縮 URL の履歴です（最大 50 件・古い順に落ち、発行から 30 日で自動失効）。ブラウザを変えたり履歴を消すと失われます。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {entries && entries.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="header-action"
                  title="この一覧を全て削除（発行済み URL 自体は残ります）"
                >
                  🗑 履歴を全削除
                </button>
              )}
              <a href={base ? `${base}/` : '/'} className="header-action">
                ← 入力画面に戻る
              </a>
            </div>
          </div>
        </header>
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>
          <div className="glass-panel">
            {entries === null ? (
              <p style={{ fontSize: '.875rem', color: 'var(--color-text-muted)' }}>読み込み中…</p>
            ) : entries.length === 0 ? (
              <p style={{ fontSize: '.875rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                履歴はまだありません。<br />
                入力を最後まで進めて「シェア用URLを作成してコピー」ボタンを押すと、その URL がここに残ります。
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>発行日時</th>
                      <th style={{ width: 90 }}>種別</th>
                      <th>氏名</th>
                      <th style={{ width: 200 }}>期</th>
                      <th style={{ width: 180 }}>リンク</th>
                      <th style={{ width: 70 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => {
                      const shareUrl = base ? `${base}/s/${e.token}` : `/s/${e.token}`;
                      const pdfUrl = base ? `${base}/pdf/${e.token}?print=1` : `/pdf/${e.token}?print=1`;
                      return (
                        <tr key={e.token}>
                          <td style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(e.createdAt)}
                          </td>
                          <td style={{ fontSize: '.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 999,
                                background:
                                  e.kind === 'supervisor' ? 'rgba(123,183,133,.22)' : 'rgba(196,193,176,.42)',
                                color: 'var(--color-text)',
                                fontSize: '.6875rem',
                              }}
                            >
                              {KIND_LABEL[e.kind]}
                            </span>
                          </td>
                          <td style={{ fontSize: '.8125rem' }}>{e.name || '（未入力）'}</td>
                          <td style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>{e.period || '—'}</td>
                          <td style={{ fontSize: '.75rem' }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--color-info)', textDecoration: 'underline' }}
                              >
                                閲覧
                              </a>
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--color-info)', textDecoration: 'underline' }}
                              >
                                PDF
                              </a>
                            </div>
                          </td>
                          <td style={{ fontSize: '.6875rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemove(e.token, e.name)}
                              title="この履歴を削除（URL 自体は残ります）"
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(220, 38, 38, 0.30)',
                                color: 'var(--color-error)',
                                borderRadius: 999,
                                padding: '2px 10px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '.6875rem',
                              }}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
