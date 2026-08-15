import { useEffect, useState } from "react";
import { Folder as FolderIcon, ChevronRight } from "lucide-react";
import type { FileDto, FolderDto, BreadcrumbEntry } from "@data-room/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dataRoomApi, folderApi, fileApi, getApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileDto;
  roomId: string;
  onMoved: () => void;
}

export function MoveFileDialog({ open, onOpenChange, file, roomId, onMoved }: MoveFileDialogProps) {
  const [folderId, setFolderId] = useState<string | null>(file.folderId);
  const [crumbs, setCrumbs] = useState<BreadcrumbEntry[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFolderId(file.folderId);
  }, [open, file.folderId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const req = folderId ? folderApi.get(folderId) : dataRoomApi.contents(roomId);
    req
      .then((data) => {
        setCrumbs(data.breadcrumb);
        setFolders(data.folders);
      })
      .finally(() => setLoading(false));
  }, [open, folderId, roomId]);

  const isSameLocation = folderId === file.folderId;

  async function handleMove() {
    setMoving(true);
    setError(null);
    try {
      await fileApi.update(file.id, { folderId });
      toast.success(`Moved "${file.name}"`);
      onMoved();
      onOpenChange(false);
    } catch (err) {
      setError(getApiError(err)?.message ?? "Could not move file");
    } finally {
      setMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{file.name}"</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>

        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={c.id ?? "root"} className="flex items-center gap-1">
              <button
                className={i === crumbs.length - 1 ? "font-medium text-foreground" : "hover:underline"}
                onClick={() => setFolderId(c.id)}
              >
                {c.name}
              </button>
              {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          ))}
        </nav>

        <div className="h-64 overflow-y-auto rounded-md border">
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!loading && folders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No subfolders here.</p>}
          {!loading &&
            folders.map((f) => (
              <button
                key={f.id}
                className="flex w-full items-center gap-2.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent/50"
                onClick={() => setFolderId(f.id)}
              >
                <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moving || isSameLocation}>
            {moving ? "Moving…" : isSameLocation ? "Already here" : "Move here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
