import { useState } from "react";
import { KeyRound, Check, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiKey, setApiKey } from "@/lib/grading";

export function ApiKeyCard({ onSaved }: { onSaved?: () => void }) {
  const [value, setValue] = useState(getApiKey());
  const [saved, setSaved] = useState(!!getApiKey());

  const save = () => {
    setApiKey(value);
    setSaved(!!value.trim());
    onSaved?.();
  };

  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-pen" />
        <p className="font-medium text-foreground">Your Gemini API key</p>
        {saved && <Check className="h-4 w-4 text-pen" />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Grading runs entirely in your browser using your own key. It is stored only on this device.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="AIza…"
          className="flex-1"
        />
        <Button variant="pen" onClick={save} disabled={!value.trim()}>
          Save
        </Button>
      </div>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-pen hover:underline"
      >
        Get a free key from Google AI Studio <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
