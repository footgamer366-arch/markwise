import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreReport } from "@/lib/scoring";

export function GradeReport({ report, studentName }: { report: ScoreReport; studentName: string }) {
  const grade = letterGrade(report.percentage);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-paper">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Result for</p>
            <h2 className="font-serif text-3xl text-foreground">{studentName || "Student"}</h2>
            <p className="mt-1 text-muted-foreground">
              {report.questions.filter((q) => q.counted && q.attempted).length} answers counted
            </p>
          </div>
          <div className="flex items-center gap-6">
            <ScoreDial percentage={report.percentage} />
            <div className="text-right">
              <p className="font-mono text-3xl font-semibold text-foreground">
                {report.awardedTotal}
                <span className="text-lg text-muted-foreground"> / {report.maxTotal}</span>
              </p>
              <p className="mt-1 font-serif text-2xl text-pen">Grade {grade}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {report.questions.map((q, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border bg-card p-4 transition-colors",
              !q.counted && "opacity-60",
            )}
          >
            <div className="flex items-start gap-3">
              <StatusIcon attempted={q.attempted} full={q.awarded >= q.maxMarks && q.maxMarks > 0} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-lg text-foreground">
                    <span className="font-mono text-sm text-pen">Q{q.number}</span> {q.text}
                  </h3>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {q.awarded} / {q.maxMarks}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{q.feedback}</p>
                {!q.counted && (
                  <p className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {q.droppedReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ attempted, full }: { attempted: boolean; full: boolean }) {
  if (!attempted) return <MinusCircle className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />;
  if (full) return <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" />;
  return <XCircle className="mt-1 h-5 w-5 shrink-0 text-pen" />;
}

function ScoreDial({ percentage }: { percentage: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, percentage) / 100) * circ;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--secondary)" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="var(--pen)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="42" y="42" transform="rotate(90 42 42)" textAnchor="middle" dominantBaseline="central"
        className="fill-foreground font-mono text-base font-semibold">
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

function letterGrade(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}
