import { useEffect, useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiError } from "@/lib/api";

interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (name: string) => Promise<void>;
}

/** Name-entry dialog for create/rename flows. Surfaces 409 conflicts with the server's suggested name. */
export function NameDialog({ open, onOpenChange, title, description, label, initialValue = "", submitLabel = "Save", onSubmit }: NameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setSuggestion(null);
    }
  }, [open, initialValue]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    setSuggestion(null);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch (err) {
      const apiErr = getApiError(err);
      if (apiErr?.error === "CONFLICT") {
        setError(apiErr.message);
        setSuggestion(apiErr.suggestedName ?? null);
      } else {
        setError(apiErr?.message ?? "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-1.5 py-4">
            <Label htmlFor="name-dialog-input">{label}</Label>
            <Input
              id="name-dialog-input"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
            />
            {error && (
              <div className="pt-1 text-sm text-destructive">
                {error}
                {suggestion && (
                  <button
                    type="button"
                    className="ml-1 underline underline-offset-2"
                    onClick={() => {
                      setValue(suggestion);
                      setError(null);
                      setSuggestion(null);
                    }}
                  >
                    Use "{suggestion}"
                  </button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !value.trim()}>
              {submitting ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
