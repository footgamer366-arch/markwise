export interface MarkSchemeQuestion {
  number: string;
  text: string;
  maxMarks: number;
  group: string | null;
}

export interface MarkSchemeGroup {
  name: string;
  choose: number;
}

export interface MarkScheme {
  examTotalMarks: number;
  groups: MarkSchemeGroup[];
  questions: MarkSchemeQuestion[];
}

export interface GradeResult {
  number: string;
  awarded: number;
  feedback: string;
  attempted: boolean;
}

export interface ScoredQuestion {
  number: string;
  text: string;
  maxMarks: number;
  awarded: number;
  feedback: string;
  attempted: boolean;
  group: string | null;
  counted: boolean;
  droppedReason?: string;
}

export interface ScoreReport {
  questions: ScoredQuestion[];
  awardedTotal: number;
  maxTotal: number;
  percentage: number;
}

/**
 * Combine the mark scheme with the AI grading results, applying optional-group
 * rules: within a group where the student must "choose N", only the best N
 * attempted answers are counted; lower-scoring extras are dropped.
 */
export function buildScoreReport(scheme: MarkScheme, results: GradeResult[]): ScoreReport {
  const resultByNumber = new Map(results.map((r) => [r.number, r]));

  const scored: ScoredQuestion[] = scheme.questions.map((q) => {
    const r = resultByNumber.get(q.number);
    const awarded = r ? clamp(r.awarded, 0, q.maxMarks) : 0;
    return {
      number: q.number,
      text: q.text,
      maxMarks: q.maxMarks,
      awarded: r?.attempted ? awarded : 0,
      feedback: r?.feedback ?? "No answer found for this question.",
      attempted: r?.attempted ?? false,
      group: q.group,
      counted: true,
    };
  });

  // Apply optional-group dropping.
  for (const group of scheme.groups) {
    const members = scored.filter((q) => q.group === group.name);
    if (members.length <= group.choose) continue;

    // Rank attempted answers by awarded marks (desc). Keep best `choose`.
    const attempted = members.filter((m) => m.attempted);
    const ranked = [...attempted].sort((a, b) => b.awarded - a.awarded);
    const keep = new Set(ranked.slice(0, group.choose).map((m) => m.number));

    for (const m of members) {
      if (!keep.has(m.number)) {
        m.counted = false;
        m.droppedReason = m.attempted
          ? "Extra optional answer — lower score not counted"
          : "Not attempted";
      }
    }
  }

  const counted = scored.filter((q) => q.counted);
  const awardedTotal = round1(counted.reduce((s, q) => s + q.awarded, 0));
  const summedMax = counted.reduce((s, q) => s + q.maxMarks, 0);
  const maxTotal = scheme.examTotalMarks > 0 ? scheme.examTotalMarks : summedMax;
  const percentage = maxTotal > 0 ? round1((awardedTotal / maxTotal) * 100) : 0;

  return { questions: scored, awardedTotal, maxTotal, percentage };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
