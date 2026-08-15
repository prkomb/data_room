import axios, { AxiosProgressEvent } from "axios";
import type {
  UserDto,
  DataRoomDto,
  FolderDto,
  FileDto,
  FolderContentsDto,
  ShareDto,
  DeletePreviewDto,
  PublicRootDto,
} from "@data-room/shared";
import { getToken, clearToken } from "./auth-storage";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/public")) {
        location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export interface ApiErrorBody {
  error: string;
  message: string;
  suggestedName?: string;
}

export function getApiError(err: unknown): ApiErrorBody | null {
  if (axios.isAxiosError(err) && err.response?.data) {
    return err.response.data as ApiErrorBody;
  }
  return null;
}

// ---- Auth ----
export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    http.post<{ token: string; user: UserDto }>("/auth/register", body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    http.post<{ token: string; user: UserDto }>("/auth/login", body).then((r) => r.data),
  google: (idToken: string) =>
    http.post<{ token: string; user: UserDto }>("/auth/google", { idToken }).then((r) => r.data),
  me: () => http.get<{ user: UserDto }>("/auth/me").then((r) => r.data.user),
};

// ---- Data rooms ----
export const dataRoomApi = {
  list: () => http.get<{ dataRooms: DataRoomDto[] }>("/data-rooms").then((r) => r.data.dataRooms),
  create: (name: string) =>
    http.post<{ dataRoom: DataRoomDto }>("/data-rooms", { name }).then((r) => r.data.dataRoom),
  get: (id: string) => http.get<{ dataRoom: DataRoomDto }>(`/data-rooms/${id}`).then((r) => r.data.dataRoom),
  rename: (id: string, name: string) =>
    http.patch<{ dataRoom: DataRoomDto }>(`/data-rooms/${id}`, { name }).then((r) => r.data.dataRoom),
  remove: (id: string) => http.delete(`/data-rooms/${id}`),
  deletePreview: (id: string) =>
    http.get<DeletePreviewDto>(`/data-rooms/${id}/delete-preview`).then((r) => r.data),
  contents: (id: string) => http.get<FolderContentsDto>(`/data-rooms/${id}/contents`).then((r) => r.data),
  search: (id: string, q: string) =>
    http
      .get<{ folders: FolderDto[]; files: FileDto[] }>(`/data-rooms/${id}/search`, { params: { q } })
      .then((r) => r.data),
};

// ---- Folders ----
export const folderApi = {
  get: (id: string) => http.get<FolderContentsDto>(`/folders/${id}`).then((r) => r.data),
  create: (body: { dataRoomId: string; parentId: string | null; name: string }) =>
    http.post<{ folder: FolderDto }>("/folders", body).then((r) => r.data.folder),
  rename: (id: string, name: string) =>
    http.patch<{ folder: FolderDto }>(`/folders/${id}`, { name }).then((r) => r.data.folder),
  remove: (id: string) => http.delete(`/folders/${id}`),
  deletePreview: (id: string) => http.get<DeletePreviewDto>(`/folders/${id}/delete-preview`).then((r) => r.data),
};

// ---- Files ----
export const fileApi = {
  upload: (
    body: { dataRoomId: string; folderId: string | null; file: File },
    onProgress?: (pct: number) => void
  ) => {
    const form = new FormData();
    form.append("dataRoomId", body.dataRoomId);
    if (body.folderId) form.append("folderId", body.folderId);
    form.append("file", body.file);
    return http
      .post<{ file: FileDto }>("/files", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e: AxiosProgressEvent) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data.file);
  },
  get: (id: string) => http.get<{ file: FileDto; viewUrl: string }>(`/files/${id}`).then((r) => r.data),
  update: (id: string, body: { name?: string; folderId?: string | null }) =>
    http.patch<{ file: FileDto }>(`/files/${id}`, body).then((r) => r.data.file),
  remove: (id: string) => http.delete(`/files/${id}`),
};

// ---- Sharing ----
export interface SharedItemDto {
  shareId: string;
  resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  dataRoomName: string;
}

export const shareApi = {
  listFor: (resourceType: string, resourceId: string) =>
    http.get<{ shares: ShareDto[] }>("/shares", { params: { resourceType, resourceId } }).then((r) => r.data.shares),
  create: (body: {
    dataRoomId: string;
    resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
    resourceId: string;
    mode: "PUBLIC" | "PERMISSIONED";
    emails?: string[];
  }) => http.post<{ share: ShareDto }>("/shares", body).then((r) => r.data.share),
  addGrant: (shareId: string, email: string) =>
    http.post<{ share: ShareDto }>(`/shares/${shareId}/grants`, { email }).then((r) => r.data.share),
  removeGrant: (shareId: string, grantId: string) => http.delete(`/shares/${shareId}/grants/${grantId}`),
  revoke: (shareId: string) => http.delete(`/shares/${shareId}`),
  sharedWithMe: () => http.get<{ items: SharedItemDto[] }>("/shared-with-me").then((r) => r.data.items),
};

// ---- Public ----
export const publicApi = {
  root: (token: string) => http.get<PublicRootDto>(`/public/${token}`).then((r) => r.data),
  folder: (token: string, folderId: string) =>
    http.get<FolderContentsDto>(`/public/${token}/folders/${folderId}`).then((r) => r.data),
  file: (token: string, fileId: string) =>
    http.get<{ file: FileDto; viewUrl: string }>(`/public/${token}/files/${fileId}`).then((r) => r.data),
};
