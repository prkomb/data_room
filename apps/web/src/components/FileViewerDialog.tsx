import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { FileDto } from "@data-room/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

interface FileViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileDto | null;
  loadView: (fileId: string) => Promise<{ file: FileDto; viewUrl: string }>;
}

export function FileViewerDialog({ open, onOpenChange, file, loadView }: FileViewerDialogProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setViewUrl(null);
      return;
    }
    setLoading(true);
    setError(null);
    loadView(file.id)
      .then((data) => setViewUrl(data.viewUrl))
      .catch(() => setError("Could not load this file"))
      .finally(() => setLoading(false));
  }, [open, file, loadView]);

  const isPdf = file?.mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="truncate">{file?.name}</DialogTitle>
          {viewUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={viewUrl} download={file?.name} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-md border bg-muted/30">
          {loading && <p className="p-6 text-sm text-muted-foreground">Loading preview…</p>}
          {error && <p className="p-6 text-sm text-destructive">{error}</p>}
          {!loading && !error && viewUrl && isPdf && (
            <iframe title={file?.name} src={viewUrl} className="h-full w-full" />
          )}
          {!loading && !error && viewUrl && !isPdf && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="font-medium">Preview unavailable for this file type</p>
              <p className="text-sm text-muted-foreground">
                {file?.mimeType} · {file && formatBytes(file.size)}
              </p>
              <Button asChild className="mt-2">
                <a href={viewUrl} download={file?.name}>
                  <Download className="h-4 w-4" />
                  Download to view
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
