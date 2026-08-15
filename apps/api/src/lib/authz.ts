import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";

export interface ChainEntry {
  resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
  resourceId: string;
}

export interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface FolderChain {
  /** Ancestor folders ordered root-first, including the folder itself. */
  folders: { id: string; name: string; parentId: string | null }[];
  dataRoomId: string;
}

/** Walks a folder's parent pointers up to the root. Small trees (typical case) — see README "How it scales". */
export async function loadFolderChain(folderId: string): Promise<FolderChain> {
  const chain: { id: string; name: string; parentId: string | null }[] = [];
  let currentId: string | null = folderId;
  let dataRoomId: string | null = null;

  while (currentId) {
    const folder: { id: string; name: string; parentId: string | null; dataRoomId: string } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true, dataRoomId: true },
      });
    if (!folder) throw new NotFoundError("Folder not found");
    dataRoomId = folder.dataRoomId;
    chain.unshift({ id: folder.id, name: folder.name, parentId: folder.parentId });
    currentId = folder.parentId;
  }

  if (!dataRoomId) throw new NotFoundError("Folder not found");
  return { folders: chain, dataRoomId };
}

export async function buildBreadcrumb(dataRoomId: string, folderId: string | null): Promise<BreadcrumbEntry[]> {
  const dataRoom = await prisma.dataRoom.findUnique({ where: { id: dataRoomId }, select: { id: true, name: true } });
  if (!dataRoom) throw new NotFoundError("Data room not found");
  const crumbs: BreadcrumbEntry[] = [{ id: null, name: dataRoom.name }];
  if (folderId) {
    const chain = await loadFolderChain(folderId);
    for (const f of chain.folders) crumbs.push({ id: f.id, name: f.name });
  }
  return crumbs;
}

async function ownsDataRoom(dataRoomId: string, userId: string): Promise<boolean> {
  const room = await prisma.dataRoom.findUnique({ where: { id: dataRoomId }, select: { ownerId: true } });
  return room?.ownerId === userId;
}

/** Ancestor chain (resource itself first) used for both permissioned + public share lookups. */
export async function buildChain(opts: {
  dataRoomId: string;
  folderId?: string | null;
  fileId?: string;
}): Promise<ChainEntry[]> {
  const chain: ChainEntry[] = [];
  if (opts.fileId) chain.push({ resourceType: "FILE", resourceId: opts.fileId });
  if (opts.folderId) {
    const { folders } = await loadFolderChain(opts.folderId);
    for (let i = folders.length - 1; i >= 0; i--) {
      chain.push({ resourceType: "FOLDER", resourceId: folders[i].id });
    }
  }
  chain.push({ resourceType: "DATA_ROOM", resourceId: opts.dataRoomId });
  return chain;
}

/** Authenticated-app access: owner, or a permissioned share grant on the resource/an ancestor. */
export async function assertViewAccess(opts: {
  dataRoomId: string;
  folderId?: string | null;
  fileId?: string;
  userId: string;
  userEmail: string;
}): Promise<{ isOwner: boolean }> {
  if (await ownsDataRoom(opts.dataRoomId, opts.userId)) return { isOwner: true };

  const chain = await buildChain(opts);
  const share = await prisma.share.findFirst({
    where: {
      dataRoomId: opts.dataRoomId,
      mode: "PERMISSIONED",
      revokedAt: null,
      OR: chain.map((c) => ({ resourceType: c.resourceType, resourceId: c.resourceId })),
      grants: { some: { userEmail: opts.userEmail } },
    },
  });
  if (!share) throw new ForbiddenError("You do not have access to this item");
  return { isOwner: false };
}

export async function assertOwnerAccess(dataRoomId: string, userId: string): Promise<void> {
  if (!(await ownsDataRoom(dataRoomId, userId))) {
    throw new ForbiddenError("Only the owner can perform this action");
  }
}

/** Public-link access: token must match a non-revoked PUBLIC share on the resource or an ancestor. */
export async function assertPublicAccess(opts: {
  token: string;
  dataRoomId: string;
  folderId?: string | null;
  fileId?: string;
}): Promise<void> {
  const chain = await buildChain(opts);
  const share = await prisma.share.findFirst({
    where: {
      dataRoomId: opts.dataRoomId,
      mode: "PUBLIC",
      token: opts.token,
      revokedAt: null,
      OR: chain.map((c) => ({ resourceType: c.resourceType, resourceId: c.resourceId })),
    },
  });
  if (!share) throw new ForbiddenError("This link is invalid or has been revoked");
}
