import {
  createDefaultFormData,
  CURRENT_PERIOD,
  FormData,
  CommitmentRow,
  SmartGoalRow,
} from '@/lib/types';

/**
 * 旧 SmartGoalRow (goal/targetValue/deadline/note) → 新 SmartGoalRow (s/m/a/r/t/note) に
 * 写し替える。旧 goal→s、旧 targetValue→m、旧 deadline→t、note はそのまま。
 * 配列長は新デフォルト（3 件）に揃え、不足は空行で補完、超過は切り捨て。
 * 単に「配列の row が undefined」なだけで PDF 側などがクラッシュするのを防ぐため、
 * app/page.tsx だけでなく PDF ルートや share ルートでも共通利用する。
 */
type LegacySmartGoalRow = Partial<SmartGoalRow> & {
  goal?: string;
  targetValue?: string;
  deadline?: string;
};

export function normalizeSmartGoals(input: unknown, defaults: SmartGoalRow[]): SmartGoalRow[] {
  if (!Array.isArray(input)) return defaults;
  return defaults.map((def, i) => {
    const raw = input[i] as LegacySmartGoalRow | undefined;
    if (!raw || typeof raw !== 'object') return def;
    return {
      relatedKpi: (raw as { relatedKpi?: string }).relatedKpi ?? '',
      s: raw.s ?? raw.goal ?? '',
      m: raw.m ?? raw.targetValue ?? '',
      a: raw.a ?? '',
      r: raw.r ?? '',
      t: raw.t ?? raw.deadline ?? '',
      note: raw.note ?? '',
    };
  });
}

/**
 * 旧仕様（買い手×3：会社／グループ／西村さん）の label フィールドは新仕様で型から
 * 削除済みで、自然に捨てられる。amount / rationale だけを引き継ぐ。
 * 行数はデフォルト（3 行固定）を基準にマップし、超過分は意図的に切り捨てる。
 */
export function normalizeCommitment(input: unknown, defaults: CommitmentRow[]): CommitmentRow[] {
  if (!Array.isArray(input)) return defaults;
  return defaults.map((_def, i) => {
    const raw = input[i] as Partial<CommitmentRow> | undefined;
    if (!raw || typeof raw !== 'object') return { amount: '', rationale: '' };
    const rawAmount = raw.amount !== undefined && raw.amount !== null ? String(raw.amount) : '';
    return {
      amount: rawAmount.replace(/[^\d]/g, ''),
      rationale: typeof raw.rationale === 'string' ? raw.rationale : '',
    };
  });
}

interface MergeOptions {
  /**
   * 常に当期を上書きするか。app/page.tsx 側の import は上書き（旧期からの引き継ぎを
   * 想定）、閲覧側の PDF/share ルートは受信 payload の期を尊重するために false 可。
   */
  forceCurrentPeriod?: boolean;
  /**
   * finalized をどう扱うか。
   * - 'preserve': payload の値を尊重（PDF/share ルート、上長コメント判定に必要）
   * - 'reset':   常に false に落とす（本人フォームへの import 経路、上長版 JSON を
   *              平社員が引き継いだときに「最初から finalized=true」で上長コメント欄が
   *              非表示になる誤動作を防ぐ）
   */
  finalized?: 'preserve' | 'reset';
}

/**
 * 旧バージョンの JSON / localStorage / サーバ .share-store を読み込んだ場合に
 * 新フィールドが undefined になり下流のレンダリングや PDF 生成が落ちるのを防ぐ。
 * app/page.tsx（本人フォーム）と PDF / share ルート（閲覧）で共通利用する。
 */
export function mergeFormData(parsed: unknown, options: MergeOptions = {}): FormData {
  const { forceCurrentPeriod = true, finalized = 'preserve' } = options;
  const def = createDefaultFormData();
  if (!parsed || typeof parsed !== 'object') return def;
  const p = parsed as Partial<FormData>;
  const merged: FormData = {
    ...def,
    ...p,
    cover: {
      ...def.cover,
      ...(p.cover ?? {}),
      period: forceCurrentPeriod ? CURRENT_PERIOD : (p.cover?.period ?? CURRENT_PERIOD),
    },
    group: { ...def.group, ...(p.group ?? {}) },
    company: { ...def.company, ...(p.company ?? {}) },
    dept: {
      ...def.dept,
      ...(p.dept ?? {}),
      kgi1: { ...def.dept.kgi1, ...(p.dept?.kgi1 ?? {}) },
      kgi2: { ...def.dept.kgi2, ...(p.dept?.kgi2 ?? {}) },
    },
    dept2: {
      ...def.dept2,
      ...(p.dept2 ?? {}),
      kgi1: { ...def.dept2.kgi1, ...(p.dept2?.kgi1 ?? {}) },
      kgi2: { ...def.dept2.kgi2, ...(p.dept2?.kgi2 ?? {}) },
    },
    personal: {
      ...def.personal,
      ...(p.personal ?? {}),
      smartGoals: normalizeSmartGoals(p.personal?.smartGoals, def.personal.smartGoals),
      commitment: normalizeCommitment(
        (() => {
          const personal = p.personal as
            | { commitment?: unknown; marketValue?: unknown }
            | undefined;
          const current = personal?.commitment;
          if (Array.isArray(current) && current.length > 0) return current;
          return personal?.marketValue;
        })(),
        def.personal.commitment,
      ),
    },
    promotion: { ...def.promotion, ...(p.promotion ?? {}) },
    bonus: { ...def.bonus, ...(p.bonus ?? {}) },
    gradeExpectations: { ...def.gradeExpectations, ...(p.gradeExpectations ?? {}) },
  };
  if (finalized === 'reset') {
    merged.finalized = false;
  }
  return merged;
}
