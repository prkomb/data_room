import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderPlus, MoreVertical, Pencil, Search, Share2, Trash2, Upload, X } from "lucide-react";
import type { FolderContentsDto, FolderDto, FileDto } from "@data-room/shared";
import { dataRoomApi, folderApi, fileApi, getApiError } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ItemList } from "@/components/ItemList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NameDialog } from "@/components/NameDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { MoveFileDialog } from "@/components/MoveFileDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { FileViewerDialog } from "@/components/FileViewerDialog";
import { UploadDropzone, UploadButtonInput } from "@/components/UploadDropzone";
import { UploadProgressList } from "@/components/UploadProgressList";
import { useUploadQueue } from "@/lib/useUploadQueue";
import { toast } from "@/components/ui/sonner";

type ShareTarget = { type: "DATA_ROOM" | "FOLDER" | "FILE"; id: string; name: string };

export default function RoomBrowserPage() {
  const { roomId, folderId } = useParams<{ roomId: string; folderId?: string }>();
  const navigate = useNavigate();

  const [contents, setContents] = useState<FolderContentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ folders: FolderDto[]; files: FileDto[] } | null>(null);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderDto | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderDto | null>(null);
  const [renameFile, setRenameFile] = useState<FileDto | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileDto | null>(null);
  const [moveFile, setMoveFile] = useState<FileDto | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [renameLocation, setRenameLocation] = useState(false);
  const [deleteLocation, setDeleteLocation] = useState(false);
  const [viewingFile, setViewingFile] = useState<FileDto | null>(null);

  const load = useCallback(() => {
    if (!roomId) return;
    setLoading(true);
    setNotFound(false);
    const req = folderId ? folderApi.get(folderId) : dataRoomApi.contents(roomId);
    req
      .then(setContents)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [roomId, folderId]);

  useEffect(load, [load]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery("");
    setSearchResults(null);
  }, [roomId, folderId]);

  useEffect(() => {
    if (!roomId || !query.trim()) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      dataRoomApi.search(roomId, query.trim()).then(setSearchResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [roomId, query]);

  const { tasks, enqueue, dismiss } = useUploadQueue(() => load());

  function handleFiles(files: File[]) {
    if (!roomId || !contents?.canEdit) return;
    enqueue(files, roomId, folderId ?? null);
  }

  if (!roomId) return null;

  if (notFound) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-medium">This item is no longer available</p>
          <p className="mb-4 text-sm text-muted-foreground">It may have been deleted, moved, or access was revoked.</p>
          <Button variant="outline" onClick={() => navigate("/rooms")}>
            Back to data rooms
          </Button>
        </div>
      </AppShell>
    );
  }

  const canEdit = contents?.canEdit ?? false;
  const currentName = folderId ? contents?.folder?.name : contents?.dataRoom.name;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {contents && <Breadcrumb crumbs={contents.breadcrumb} onNavigate={(id) => navigate(id ? `/rooms/${roomId}/folders/${id}` : `/rooms/${roomId}`)} />}

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                placeholder="Search this data room…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-56"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}

          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="h-4 w-4" />
                New folder
              </Button>
              <UploadButtonInput onFiles={handleFiles}>
                {(open) => (
                  <Button onClick={open}>
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                )}
              </UploadButtonInput>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  setShareTarget(
                    folderId
                      ? { type: "FOLDER", id: folderId, name: currentName ?? "" }
                      : { type: "DATA_ROOM", id: roomId, name: currentName ?? "" }
                  )
                }
              >
                <Share2 className="h-4 w-4" />
                Share {folderId ? "folder" : "data room"}
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => setRenameLocation(true)}>
                    <Pencil className="h-4 w-4" />
                    Rename {folderId ? "folder" : "data room"}
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onClick={() => setDeleteLocation(true)}>
                    <Trash2 className="h-4 w-4" />
                    Delete {folderId ? "folder" : "data room"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && contents && (
        <UploadDropzone onFiles={handleFiles} disabled={!canEdit}>
          <ItemList
            folders={searchResults ? searchResults.folders : contents.folders}
            files={searchResults ? searchResults.files : contents.files}
            actions={{
              canEdit,
              onOpenFolder: (f) => navigate(`/rooms/${roomId}/folders/${f.id}`),
              onOpenFile: (f) => setViewingFile(f),
              onRenameFolder: setRenameFolder,
              onDeleteFolder: setDeleteFolder,
              onShareFolder: (f) => setShareTarget({ type: "FOLDER", id: f.id, name: f.name }),
              onRenameFile: setRenameFile,
              onMoveFile: setMoveFile,
              onDeleteFile: setDeleteFile,
              onShareFile: (f) => setShareTarget({ type: "FILE", id: f.id, name: f.name }),
              onDownloadFile: (f) => setViewingFile(f),
            }}
          />
        </UploadDropzone>
      )}

      <UploadProgressList tasks={tasks} onDismiss={dismiss} />

      <NameDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="New folder"
        label="Folder name"
        submitLabel="Create"
        onSubmit={async (name) => {
          await folderApi.create({ dataRoomId: roomId, parentId: folderId ?? null, name });
          load();
        }}
      />

      {renameFolder && (
        <NameDialog
          open={!!renameFolder}
          onOpenChange={(o) => !o && setRenameFolder(null)}
          title="Rename folder"
          label="Folder name"
          initialValue={renameFolder.name}
          onSubmit={async (name) => {
            await folderApi.rename(renameFolder.id, name);
            load();
          }}
        />
      )}

      {deleteFolder && (
        <DeleteConfirmDialog
          open={!!deleteFolder}
          onOpenChange={(o) => !o && setDeleteFolder(null)}
          itemName={deleteFolder.name}
          loadPreview={() => folderApi.deletePreview(deleteFolder.id)}
          onConfirm={async () => {
            await folderApi.remove(deleteFolder.id);
            toast.success(`"${deleteFolder.name}" deleted`);
            load();
          }}
        />
      )}

      {renameLocation && contents && (
        <NameDialog
          open={renameLocation}
          onOpenChange={setRenameLocation}
          title={`Rename ${folderId ? "folder" : "data room"}`}
          label="Name"
          initialValue={currentName}
          onSubmit={async (name) => {
            if (folderId) await folderApi.rename(folderId, name);
            else await dataRoomApi.rename(roomId, name);
            load();
          }}
        />
      )}

      {deleteLocation && contents && (
        <DeleteConfirmDialog
          open={deleteLocation}
          onOpenChange={setDeleteLocation}
          itemName={currentName ?? ""}
          loadPreview={() => (folderId ? folderApi.deletePreview(folderId) : dataRoomApi.deletePreview(roomId))}
          onConfirm={async () => {
            if (folderId) {
              await folderApi.remove(folderId);
              navigate(contents.breadcrumb.length > 1 ? `/rooms/${roomId}/folders/${contents.breadcrumb.at(-2)?.id}` : `/rooms/${roomId}`);
            } else {
              await dataRoomApi.remove(roomId);
              navigate("/rooms");
            }
          }}
        />
      )}

      {renameFile && (
        <NameDialog
          open={!!renameFile}
          onOpenChange={(o) => !o && setRenameFile(null)}
          title="Rename file"
          label="File name"
          initialValue={renameFile.name}
          onSubmit={async (name) => {
            await fileApi.update(renameFile.id, { name });
            load();
          }}
        />
      )}

      {deleteFile && (
        <DeleteConfirmDialog
          open={!!deleteFile}
          onOpenChange={(o) => !o && setDeleteFile(null)}
          itemName={deleteFile.name}
          onConfirm={async () => {
            await fileApi.remove(deleteFile.id);
            toast.success(`"${deleteFile.name}" deleted`);
            load();
          }}
        />
      )}

      {moveFile && roomId && (
        <MoveFileDialog open={!!moveFile} onOpenChange={(o) => !o && setMoveFile(null)} file={moveFile} roomId={roomId} onMoved={load} />
      )}

      {shareTarget && (
        <ShareDialog
          open={!!shareTarget}
          onOpenChange={(o) => !o && setShareTarget(null)}
          dataRoomId={roomId}
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
        />
      )}

      <FileViewerDialog
        open={!!viewingFile}
        onOpenChange={(o) => !o && setViewingFile(null)}
        file={viewingFile}
        loadView={(id) => fileApi.get(id)}
      />
    </AppShell>
  );
}
