import type { DataRoomDto, FolderContentsDto } from "@data-room/shared";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { deleteObjects } from "../../lib/storage";
import { getDataRoomStorageKeys } from "../../lib/stats";
import { toFolderDto, toFileDto } from "../../lib/dto";

export function toDataRoomDto(room: { id: string; name: string; ownerId: string; createdAt: Date; updatedAt: Date }): DataRoomDto {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function requireDataRoom(id: string) {
  const room = await prisma.dataRoom.findUnique({ where: { id } });
  if (!room) throw new NotFoundError("Data room not found");
  return room;
}

export async function getRoomContents(dataRoomId: string, canEdit: boolean): Promise<FolderContentsDto> {
  const room = await requireDataRoom(dataRoomId);
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({ where: { dataRoomId, parentId: null }, orderBy: { name: "asc" } }),
    prisma.file.findMany({ where: { dataRoomId, folderId: null }, orderBy: { name: "asc" } }),
  ]);

  return {
    folder: null,
    dataRoom: toDataRoomDto(room),
    breadcrumb: [{ id: null, name: room.name }],
    folders: folders.map(toFolderDto),
    files: files.map(toFileDto),
    canEdit,
  };
}

export async function deleteDataRoom(id: string) {
  const keys = await getDataRoomStorageKeys(id);
  await deleteObjects(keys).catch(() => {
    // Best-effort cleanup: an orphaned blob is preferable to blocking the delete.
  });
  await prisma.dataRoom.delete({ where: { id } });
}
