import type { FolderDto, FileDto } from "@data-room/shared";

export function toFolderDto(f: { id: string; dataRoomId: string; parentId: string | null; name: string; createdAt: Date; updatedAt: Date }): FolderDto {
  return {
    id: f.id,
    dataRoomId: f.dataRoomId,
    parentId: f.parentId,
    name: f.name,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export function toFileDto(f: {
  id: string;
  dataRoomId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}): FileDto {
  return {
    id: f.id,
    dataRoomId: f.dataRoomId,
    folderId: f.folderId,
    name: f.name,
    size: f.size,
    mimeType: f.mimeType,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}
