import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarkScheme, MarkSchemeQuestion } from "@/lib/scoring";

interface Props {
  scheme: MarkScheme;
  onChange: (scheme: MarkScheme) => void;
}

export function MarkSchemeEditor({ scheme, onChange }: Props) {
  const update = (patch: Partial<MarkScheme>) => onChange({ ...scheme, ...patch });

  const updateQuestion = (i: number, patch: Partial<MarkSchemeQuestion>) => {
    const questions = scheme.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q));
    update({ questions });
  };

  const groupNames = scheme.groups.map((g) => g.name);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Total marks for paper</Label>
          <Input
            type="number"
            value={scheme.examTotalMarks}
            onChange={(e) => update({ examTotalMarks: Number(e.target.value) })}
            className="mt-1 w-32 font-mono"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {scheme.questions.length} questions detected
          {scheme.groups.length > 0 &&
            ` · ${scheme.groups.map((g) => `${g.name}: choose ${g.choose}`).join(", ")}`}
        </p>
      </div>

      {scheme.groups.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-accent/30 p-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Optional answer groups</Label>
          {scheme.groups.map((g, gi) => (
            <div key={gi} className="flex items-center gap-2 text-sm">
              <Input
                value={g.name}
                onChange={(e) => {
                  const groups = scheme.groups.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x));
                  update({ groups });
                }}
                className="w-40"
              />
              <span className="text-muted-foreground">choose best</span>
              <Input
                type="number"
                value={g.choose}
                onChange={(e) => {
                  const groups = scheme.groups.map((x, i) => (i === gi ? { ...x, choose: Number(e.target.value) } : x));
                  update({ groups });
                }}
                className="w-20 font-mono"
              />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[60px_1fr_90px_130px_40px] gap-2 border-b bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Q.No</span>
          <span>Question</span>
          <span>Marks</span>
          <span>Optional group</span>
          <span />
        </div>
        {scheme.questions.map((q, i) => (
          <div key={i} className="grid grid-cols-[60px_1fr_90px_130px_40px] items-center gap-2 border-b px-3 py-2 last:border-0">
            <Input value={q.number} onChange={(e) => updateQuestion(i, { number: e.target.value })} className="h-8 font-mono" />
            <Input value={q.text} onChange={(e) => updateQuestion(i, { text: e.target.value })} className="h-8" />
            <Input
              type="number"
              value={q.maxMarks}
              onChange={(e) => updateQuestion(i, { maxMarks: Number(e.target.value) })}
              className="h-8 font-mono"
            />
            <select
              value={q.group ?? ""}
              onChange={(e) => updateQuestion(i, { group: e.target.value || null })}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">—</option>
              {groupNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => update({ questions: scheme.questions.filter((_, idx) => idx !== i) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          update({
            questions: [...scheme.questions, { number: "", text: "", maxMarks: 0, group: null }],
          })
        }
      >
        <Plus className="h-4 w-4" /> Add question
      </Button>
    </div>
  );
}
