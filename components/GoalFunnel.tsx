'use client';

import { FormData } from '@/lib/types';

interface Props {
  formData: FormData;
  currentStep: number;
}

function truncate(s: string | undefined | null, n: number): string {
  if (!s) return '';
  const t = s.trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

interface TierMeta {
  /** このタイルが担当するステップ番号。部署タイルは主部署(step 4) + 兼部(step 5) を兼ねる。 */
  steps: number[];
  label: string;
}

const TIERS: TierMeta[] = [
  { steps: [2], label: '会社' },
  { steps: [3, 4], label: '部署' },
  { steps: [5], label: '個人' },
];

// 兼部シートが空欄のままかどうか。空なら「部署」タイルには主部署だけ表示する。
function hasDept2Content(d: FormData['dept2']): boolean {
  if (d.mission.trim()) return true;
  if (d.kgi1.mission.trim() || d.kgi1.kgi.trim()) return true;
  if (d.kgi2.mission.trim() || d.kgi2.kgi.trim()) return true;
  const kpis = [d.kpi1, d.kpi2, d.kpi3, d.kpi4, d.kpi5];
  if (kpis.some(k => k.label.trim() || k.prev.trim() || k.target.trim() || k.actual.trim())) return true;
  if (d.actions.some(a => a.content.trim() || a.expectedEffect.trim() || a.deadline.trim())) return true;
  return false;
}

export default function GoalFunnel({ formData, currentStep }: Props) {
  // 個人タイルには「今期の役割・期待（自己認識）」を優先表示
  const personalSummary =
    formData.personal.currentStatus.find(s => s.label.includes('役割') || s.label.includes('期待'))?.value
    || '';

  const deptSummary = truncate(formData.dept.mission || formData.dept.kgi1.kgi || formData.dept.kgi1.mission, 76);
  const dept2Summary = hasDept2Content(formData.dept2)
    ? truncate(formData.dept2.mission || formData.dept2.kgi1.kgi || formData.dept2.kgi1.mission, 76)
    : '';

  // 入力済みの内容だけ表示。未入力ならプレースホルダーは出さない。
  // 部署タイルは主部署 + 兼部の 2 行を持てるように配列で保持。
  const summaries: Record<number, string[]> = {
    2: [truncate(formData.company.strategicFocus, 76)].filter(Boolean),
    3: [deptSummary, dept2Summary].filter(Boolean),
    5: [truncate(personalSummary, 76)].filter(Boolean),
  };

  return (
    <div
      style={{
        padding: '4px 0 0',
      }}
    >
      <p
        style={{
          fontSize: '.625rem',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '.14em',
          marginBottom: 16,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        Goal Cascade
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {TIERS.map((tier, i) => {
          // すり鉢状: 100% → 90% → 80% → 70%
          const widthPct = 100 - i * 10;
          const primaryStep = tier.steps[0];
          const lastStep = tier.steps[tier.steps.length - 1];
          const isActive = tier.steps.includes(currentStep);
          const isPast = currentStep > lastStep;
          const isFuture = currentStep < primaryStep;
          const taper = 4;
          const summaryLines = summaries[primaryStep] ?? [];
          const isDeptWithBoth = tier.label === '部署' && summaryLines.length > 1;

          return (
            <div key={primaryStep} style={{ width: '100%', position: 'relative' }}>
              {i > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '5px solid var(--color-text-muted)',
                    opacity: 0.5,
                  }}
                />
              )}
              <div
                style={{
                  width: `${widthPct}%`,
                  margin: '0 auto',
                  padding: '12px 14px',
                  background: isActive
                    ? 'rgba(255,255,255,.95)'
                    : isPast
                    ? 'rgba(255,255,255,.6)'
                    : 'rgba(255,255,255,.28)',
                  clipPath: `polygon(0 0, 100% 0, calc(100% - ${taper}px) 100%, ${taper}px 100%)`,
                  boxShadow: isActive
                    ? 'inset 0 1px 0 rgba(255,255,255,.95), 0 4px 16px rgba(53,54,45,.14)'
                    : 'inset 0 1px 0 rgba(255,255,255,.6)',
                  opacity: isFuture ? 0.55 : 1,
                  transition: 'all 250ms cubic-bezier(.4,0,.2,1)',
                  marginTop: i === 0 ? 0 : 6,
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '.8125rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                    letterSpacing: '.04em',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {tier.label}
                </p>
                {summaryLines.map((line, li) => (
                  <p
                    key={li}
                    style={{
                      fontSize: '.6875rem',
                      lineHeight: 1.55,
                      color: isActive
                        ? 'var(--color-text)'
                        : isPast
                        ? 'var(--color-text)'
                        : 'var(--color-text-muted)',
                      margin: li === 0 ? '6px 0 0' : '4px 0 0',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      textAlign: 'center',
                    }}
                  >
                    {isDeptWithBoth && (
                      <span style={{ fontWeight: 600, opacity: 0.6, marginRight: 4 }}>
                        {li === 0 ? '主' : '兼'}：
                      </span>
                    )}
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
