import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, ArrowRight, Loader2, RotateCcw, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { FileUpload } from "@/components/FileUpload";
import { ApiKeyCard } from "@/components/ApiKeyCard";
import { MarkSchemeEditor } from "@/components/MarkSchemeEditor";
import { GradeReport } from "@/components/GradeReport";
import { extractPdfText, type ExtractProgress } from "@/lib/pdf-text";
import { extractMarkScheme, gradeAnswers, getApiKey } from "@/lib/grading";
import { buildScoreReport, type MarkScheme, type ScoreReport } from "@/lib/scoring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarkWise — AI Exam Grader" },
      { name: "description", content: "Grade student answer papers against a model answer key with AI. Per-question feedback, accuracy scores, and smart handling of optional questions." },
      { property: "og:title", content: "MarkWise — AI Exam Grader" },
      { property: "og:description", content: "Grade student answer papers against a model answer key with AI feedback and accuracy scores." },
    ],
  }),
  component: Index,
});

type Step = "upload" | "review" | "report";

function Index() {
  const extractFn = useServerFn(extractMarkScheme);
  const gradeFn = useServerFn(gradeAnswers);

  const [step, setStep] = useState<Step>("upload");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [modelText, setModelText] = useState("");
  const [studentText, setStudentText] = useState("");
  const [studentName, setStudentName] = useState("");
  const [scheme, setScheme] = useState<MarkScheme | null>(null);
  const [report, setReport] = useState<ScoreReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState<"model" | "student" | null>(null);
  const [modelProgress, setModelProgress] = useState<string | null>(null);
  const [studentProgress, setStudentProgress] = useState<string | null>(null);

  const progressLabel = (p: ExtractProgress): string => {
    if (p.stage === "loading") return "Opening PDF…";
    if (p.stage === "ocr") {
      const pct = Math.round((p.ocrProgress ?? 0) * 100);
      return `Reading handwriting (OCR) — page ${p.page}/${p.totalPages} · ${pct}%`;
    }
    if (p.stage === "text") return `Extracting text — page ${p.page}/${p.totalPages}`;
    return "Finishing up…";
  };

  const handleModel = async (file: File) => {
    setModelFile(file);
    setParsing("model");
    setModelProgress("Opening PDF…");
    try {
      setModelText(await extractPdfText(file, (p) => setModelProgress(progressLabel(p))));
    } catch {
      toast.error("Could not read that PDF. Try another file.");
      setModelFile(null);
    } finally {
      setParsing(null);
      setModelProgress(null);
    }
  };

  const handleStudent = async (file: File) => {
    setStudentFile(file);
    setParsing("student");
    setStudentProgress("Opening PDF…");
    try {
      setStudentText(await extractPdfText(file, (p) => setStudentProgress(progressLabel(p))));
    } catch {
      toast.error("Could not read that PDF. Try another file.");
      setStudentFile(null);
    } finally {
      setParsing(null);
      setStudentProgress(null);
    }
  };

  const handleAnalyze = async () => {
    if (!modelText || !studentText) return;
    setBusy(true);
    try {
      const result = await extractFn({ data: { modelText } });
      if (!result?.questions?.length) {
        toast.error("Couldn't detect questions in the model paper. Check the file.");
        return;
      }
      setScheme({
        examTotalMarks: result.examTotalMarks ?? 0,
        groups: result.groups ?? [],
        questions: result.questions,
      });
      setStep("review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleGrade = async () => {
    if (!scheme) return;
    setBusy(true);
    try {
      const { results } = await gradeFn({
        data: { modelText, studentText, questions: scheme.questions },
      });
      setReport(buildScoreReport(scheme, results ?? []));
      setStep("report");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grading failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setModelFile(null);
    setStudentFile(null);
    setModelText("");
    setStudentText("");
    setScheme(null);
    setReport(null);
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" />

      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pen text-pen-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-serif text-xl font-semibold text-foreground">MarkWise</p>
              <p className="text-xs text-muted-foreground">AI exam grader</p>
            </div>
          </div>
          {step !== "upload" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> New paper
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Stepper step={step} />

        {step === "upload" && (
          <section className="mt-10">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
                Grade like an examiner, in seconds
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Upload the model answer key and a student's answer sheet. MarkWise compares them,
                awards marks per question, and handles optional questions automatically.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <FileUpload
                label="Model answer key"
                hint="Drop the correct-answers PDF here"
                fileName={modelFile?.name ?? null}
                loading={parsing === "model"}
                progressLabel={modelProgress}
                onFile={handleModel}
                accent
              />
              <FileUpload
                label="Student answer sheet"
                hint="Drop the student's PDF here"
                fileName={studentFile?.name ?? null}
                loading={parsing === "student"}
                progressLabel={studentProgress}
                onFile={handleStudent}
              />
            </div>

            <div className="mx-auto mt-6 max-w-xs">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Student name (optional)</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aanya Sharma"
                className="mt-1"
              />
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                variant="pen"
                disabled={!modelText || !studentText || busy || parsing !== null}
                onClick={handleAnalyze}
              >
                {busy ? <Loader2 className="animate-spin" /> : <ScrollText className="h-4 w-4" />}
                Analyse mark scheme
                {!busy && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </section>
        )}

        {step === "review" && scheme && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl text-foreground">Review the mark scheme</h2>
            <p className="mt-1 text-muted-foreground">
              Confirm the marks and optional groups MarkWise detected, then grade the student.
            </p>
            <div className="mt-6">
              <MarkSchemeEditor scheme={scheme} onChange={setScheme} />
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button variant="pen" disabled={busy} onClick={handleGrade}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Grade student answers
                {!busy && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </section>
        )}

        {step === "report" && report && (
          <section className="mt-10">
            <GradeReport report={report} studentName={studentName} />
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Grade another paper
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "review", label: "Mark scheme" },
    { key: "report", label: "Report" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto flex max-w-md items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs " +
                (i <= activeIndex ? "bg-pen text-pen-foreground" : "bg-secondary text-muted-foreground")
              }
            >
              {i + 1}
            </span>
            <span
              className={
                "text-sm " + (i <= activeIndex ? "font-medium text-foreground" : "text-muted-foreground")
              }
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <span className="h-px w-8 bg-border" />}
        </div>
      ))}
    </div>
  );
}
