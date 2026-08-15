import { Folder as FolderIcon, FileText, MoreVertical, Pencil, Trash2, Share2, FolderInput, Download } from "lucide-react";
import type { FolderDto, FileDto } from "@data-room/shared";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";

export interface ItemListActions {
  canEdit: boolean;
  onOpenFolder: (folder: FolderDto) => void;
  onOpenFile: (file: FileDto) => void;
  onRenameFolder: (folder: FolderDto) => void;
  onDeleteFolder: (folder: FolderDto) => void;
  onShareFolder: (folder: FolderDto) => void;
  onRenameFile: (file: FileDto) => void;
  onMoveFile: (file: FileDto) => void;
  onDeleteFile: (file: FileDto) => void;
  onShareFile: (file: FileDto) => void;
  onDownloadFile: (file: FileDto) => void;
}

interface ItemListProps {
  folders: FolderDto[];
  files: FileDto[];
  actions: ItemListActions;
}

export function ItemList({ folders, files, actions }: ItemListProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
        <FolderIcon className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">This folder is empty</p>
        <p className="text-sm text-muted-foreground">
          {actions.canEdit ? "Create a folder or upload files to get started." : "Nothing has been shared here yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Name</span>
        <span className="w-24 text-right">Size</span>
        <span className="w-28 text-right">Updated</span>
        <span className="w-9" />
      </div>
      <div className="divide-y">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="group grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 hover:bg-accent/50"
            onClick={() => actions.onOpenFolder(folder)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FolderIcon className="h-4.5 w-4.5 shrink-0 fill-muted-foreground/20 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{folder.name}</span>
            </span>
            <span className="w-24 text-right text-sm text-muted-foreground">—</span>
            <span className="w-28 text-right text-sm text-muted-foreground">{formatDate(folder.updatedAt)}</span>
            <span className="w-9" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => actions.onShareFolder(folder)}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onRenameFolder(folder)}>
                        <Pencil className="h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onClick={() => actions.onDeleteFolder(folder)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {!actions.canEdit && <DropdownMenuItem onClick={() => actions.onOpenFolder(folder)}>Open</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
        {files.map((file) => (
          <div
            key={file.id}
            className="group grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 hover:bg-accent/50"
            onClick={() => actions.onOpenFile(file)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FileText className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{file.name}</span>
            </span>
            <span className="w-24 text-right text-sm text-muted-foreground">{formatBytes(file.size)}</span>
            <span className="w-28 text-right text-sm text-muted-foreground">{formatDate(file.updatedAt)}</span>
            <span className="w-9" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onDownloadFile(file)}>
                    <Download className="h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  {actions.canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => actions.onShareFile(file)}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onRenameFile(file)}>
                        <Pencil className="h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onMoveFile(file)}>
                        <FolderInput className="h-4 w-4" />
                        Move
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onClick={() => actions.onDeleteFile(file)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
