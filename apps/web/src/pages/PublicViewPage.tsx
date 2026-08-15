import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, FolderLock, Lock } from "lucide-react";
import type { FolderContentsDto, FileDto } from "@data-room/shared";
import { publicApi } from "@/lib/api";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ItemList } from "@/components/ItemList";
import { FileViewerDialog } from "@/components/FileViewerDialog";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

export default function PublicViewPage() {
  const { token, folderId } = useParams<{ token: string; folderId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [folderContents, setFolderContents] = useState<FolderContentsDto | null>(null);
  const [singleFile, setSingleFile] = useState<{ file: FileDto; viewUrl: string; dataRoomName: string } | null>(null);
  const [viewingFile, setViewingFile] = useState<FileDto | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setInvalid(false);
    const req = folderId ? publicApi.folder(token, folderId) : publicApi.root(token);
    req
      .then((data) => {
        if ("kind" in data && data.kind === "file") {
          setSingleFile(data);
          setFolderContents(null);
        } else {
          setFolderContents(data as FolderContentsDto);
          setSingleFile(null);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token, folderId]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <FolderLock className="h-5 w-5" />
            Data Room
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            <Lock className="h-3 w-3" />
            Shared link · view only
          </span>
        </div>
      </header>

      <main className="container py-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && invalid && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="font-medium">This link is invalid or has been revoked</p>
            <p className="mb-4 text-sm text-muted-foreground">Ask the owner to share a new link.</p>
            <Button variant="outline" asChild>
              <Link to="/login">Sign in instead</Link>
            </Button>
          </div>
        )}

        {!loading && singleFile && (
          <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 text-center">
            <p className="mb-1 text-sm text-muted-foreground">{singleFile.dataRoomName}</p>
            <h1 className="mb-1 text-lg font-semibold">{singleFile.file.name}</h1>
            <p className="mb-4 text-sm text-muted-foreground">{formatBytes(singleFile.file.size)}</p>
            <div className="mx-auto h-[70vh] overflow-hidden rounded-md border">
              {singleFile.file.mimeType === "application/pdf" ? (
                <iframe title={singleFile.file.name} src={singleFile.viewUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Button asChild>
                    <a href={singleFile.viewUrl} download={singleFile.file.name}>
                      <Download className="h-4 w-4" />
                      Download to view
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && folderContents && (
          <>
            <div className="mb-4">
              <Breadcrumb
                crumbs={folderContents.breadcrumb}
                onNavigate={(id) => navigate(id ? `/public/${token}/folders/${id}` : `/public/${token}`)}
              />
            </div>
            <ItemList
              folders={folderContents.folders}
              files={folderContents.files}
              actions={{
                canEdit: false,
                onOpenFolder: (f) => navigate(`/public/${token}/folders/${f.id}`),
                onOpenFile: (f) => setViewingFile(f),
                onRenameFolder: () => {},
                onDeleteFolder: () => {},
                onShareFolder: () => {},
                onRenameFile: () => {},
                onMoveFile: () => {},
                onDeleteFile: () => {},
                onShareFile: () => {},
                onDownloadFile: (f) => setViewingFile(f),
              }}
            />
          </>
        )}
      </main>

      <FileViewerDialog
        open={!!viewingFile}
        onOpenChange={(o) => !o && setViewingFile(null)}
        file={viewingFile}
        loadView={(id) => publicApi.file(token, id)}
      />
    </div>
  );
}
