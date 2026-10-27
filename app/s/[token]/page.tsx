import type { Metadata } from 'next';
import ShareView, { ShareError } from '@/components/ShareView';
import { readShare } from '@/lib/share-store';
import { mergeFormData } from '@/lib/normalize-form-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  try {
    const { token } = await params;
    const raw = await readShare(token);
    const name = ((raw as { cover?: { name?: string } } | null)?.cover?.name ?? '').trim();
    if (!name) return { title: '目標設定シート 2026年10月-2027年3月期 (v2) | INSTYLE GROUP' };
    return { title: `${name} | 目標設定シート 2026年10月-2027年3月期 (v2) | INSTYLE GROUP` };
  } catch {
    return { title: '目標設定シート 2026年10月-2027年3月期 (v2) | INSTYLE GROUP' };
  }
}

export default async function ShareByTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = await readShare(token).catch(() => null);
  // 閲覧 URL 側は受信 payload の期 & finalized を尊重する（本人フォームの import と違う扱い）
  const data = raw ? mergeFormData(raw, { forceCurrentPeriod: false, finalized: 'preserve' }) : null;
  if (!data) {
    return <ShareError message="シェアリンクが見つかりませんでした。発行者に再度生成してもらってください。" />;
  }
  return <ShareView data={data} token={token} />;
}
