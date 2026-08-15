import type { FolderContentsDto } from "@data-room/shared";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { toFolderDto, toFileDto } from "../../lib/dto";
import { buildBreadcrumb } from "../../lib/authz";
import { deleteObjects } from "../../lib/storage";
import { getFolderSubtreeStorageKeys } from "../../lib/stats";

export async function requireFolder(id: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) throw new NotFoundError("Folder not found");
  return folder;
}

export async function getFolderContents(folderId: string, canEdit: boolean): Promise<FolderContentsDto> {
  const folder = await requireFolder(folderId);
  const [room, breadcrumb, folders, files] = await Promise.all([
    prisma.dataRoom.findUniqueOrThrow({ where: { id: folder.dataRoomId } }),
    buildBreadcrumb(folder.dataRoomId, folder.id),
    prisma.folder.findMany({ where: { dataRoomId: folder.dataRoomId, parentId: folder.id }, orderBy: { name: "asc" } }),
    prisma.file.findMany({ where: { dataRoomId: folder.dataRoomId, folderId: folder.id }, orderBy: { name: "asc" } }),
  ]);

  return {
    folder: toFolderDto(folder),
    dataRoom: { id: room.id, name: room.name, ownerId: room.ownerId, createdAt: room.createdAt.toISOString(), updatedAt: room.updatedAt.toISOString() },
    breadcrumb,
    folders: folders.map(toFolderDto),
    files: files.map(toFileDto),
    canEdit,
  };
}

export async function deleteFolder(folderId: string) {
  const keys = await getFolderSubtreeStorageKeys(folderId);
  await deleteObjects(keys).catch(() => {
    // Best-effort cleanup: an orphaned blob is preferable to blocking the delete.
  });
  await prisma.folder.delete({ where: { id: folderId } });
}
