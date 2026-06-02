import { useRef, useState } from "react";
import { FileText, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  label: string;
  hint: string;
  fileName: string | null;
  loading?: boolean;
  progressLabel?: string | null;
  onFile: (file: File) => void;
  accent?: boolean;
}

export function FileUpload({ label, hint, fileName, loading, progressLabel, onFile, accent }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type === "application/pdf") onFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center transition-all",
        dragging ? "border-pen bg-accent/40" : "border-border hover:border-pen/60",
        accent && "ring-1 ring-pen/20",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          fileName ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground group-hover:text-pen",
        )}
      >
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : fileName ? (
          <CheckCircle2 />
        ) : (
          <UploadCloud />
        )}
      </div>
      <p className="font-serif text-lg font-medium text-foreground">{label}</p>
      {fileName ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-success">
          <FileText className="h-4 w-4" /> {fileName}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
