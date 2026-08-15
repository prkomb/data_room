export type ResourceType = "DATA_ROOM" | "FOLDER" | "FILE";
export type ShareMode = "PUBLIC" | "PERMISSIONED";
export type ShareRole = "VIEWER";

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface DataRoomDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDto {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileDto {
  id: string;
  dataRoomId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

export interface FolderContentsDto {
  folder: FolderDto | null;
  dataRoom: DataRoomDto;
  breadcrumb: BreadcrumbEntry[];
  folders: FolderDto[];
  files: FileDto[];
  canEdit: boolean;
}

export interface ShareDto {
  id: string;
  dataRoomId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  mode: ShareMode;
  token: string | null;
  createdAt: string;
  revokedAt: string | null;
  grants: ShareGrantDto[];
}

export interface ShareGrantDto {
  id: string;
  userEmail: string;
  role: ShareRole;
}

export interface ConflictErrorBody {
  error: "CONFLICT";
  message: string;
  suggestedName: string;
}

export interface DeletePreviewDto {
  folderCount: number;
  fileCount: number;
  totalSize: number;
}

export type PublicRootDto =
  | ({ kind: "folder" } & FolderContentsDto)
  | { kind: "file"; file: FileDto; viewUrl: string; dataRoomName: string };
