import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { DeletePreviewDto } from "@data-room/shared";
import { formatBytes } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  /** Pass null for a file (no nested-content preview needed); a loader for folders/rooms. */
  loadPreview?: () => Promise<DeletePreviewDto>;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({ open, onOpenChange, itemName, loadPreview, onConfirm }: DeleteConfirmDialogProps) {
  const [preview, setPreview] = useState<DeletePreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && loadPreview) {
      setLoading(true);
      loadPreview()
        .then(setPreview)
        .finally(() => setLoading(false));
    } else {
      setPreview(null);
    }
  }, [open, loadPreview]);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  const hasNestedContent = preview && (preview.folderCount > 0 || preview.fileCount > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{itemName}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {loadPreview && loading && <p>Checking contents…</p>}
              {loadPreview && !loading && hasNestedContent && (
                <p>
                  This will permanently delete{" "}
                  <strong>
                    {preview!.folderCount} folder{preview!.folderCount === 1 ? "" : "s"} and {preview!.fileCount} file
                    {preview!.fileCount === 1 ? "" : "s"}
                  </strong>{" "}
                  ({formatBytes(preview!.totalSize)}) nested inside it, including any shares on that content. This
                  cannot be undone.
                </p>
              )}
              {loadPreview && !loading && !hasNestedContent && <p>This cannot be undone.</p>}
              {!loadPreview && <p>This cannot be undone.</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting || loading}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
