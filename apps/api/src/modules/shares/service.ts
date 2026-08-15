import { randomBytes } from "crypto";
import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";

type ResourceType = "DATA_ROOM" | "FOLDER" | "FILE";

export async function assertResourceBelongsToRoom(dataRoomId: string, resourceType: ResourceType, resourceId: string) {
  if (resourceType === "DATA_ROOM") {
    if (resourceId !== dataRoomId) throw new BadRequestError("resourceId must equal dataRoomId for DATA_ROOM shares");
    return;
  }
  if (resourceType === "FOLDER") {
    const folder = await prisma.folder.findUnique({ where: { id: resourceId } });
    if (!folder || folder.dataRoomId !== dataRoomId) throw new NotFoundError("Folder not found in this data room");
    return;
  }
  const file = await prisma.file.findUnique({ where: { id: resourceId } });
  if (!file || file.dataRoomId !== dataRoomId) throw new NotFoundError("File not found in this data room");
}

async function resolveResourceName(resourceType: ResourceType, resourceId: string): Promise<string> {
  if (resourceType === "DATA_ROOM") {
    const room = await prisma.dataRoom.findUnique({ where: { id: resourceId }, select: { name: true } });
    return room?.name ?? "Untitled";
  }
  if (resourceType === "FOLDER") {
    const folder = await prisma.folder.findUnique({ where: { id: resourceId }, select: { name: true } });
    return folder?.name ?? "Untitled";
  }
  const file = await prisma.file.findUnique({ where: { id: resourceId }, select: { name: true } });
  return file?.name ?? "Untitled";
}

export async function toShareDto(share: {
  id: string;
  dataRoomId: string;
  resourceType: ResourceType;
  resourceId: string;
  mode: "PUBLIC" | "PERMISSIONED";
  token: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  grants: { id: string; userEmail: string; role: "VIEWER" }[];
}) {
  return {
    id: share.id,
    dataRoomId: share.dataRoomId,
    resourceType: share.resourceType,
    resourceId: share.resourceId,
    resourceName: await resolveResourceName(share.resourceType, share.resourceId),
    mode: share.mode,
    token: share.token,
    createdAt: share.createdAt.toISOString(),
    revokedAt: share.revokedAt?.toISOString() ?? null,
    grants: share.grants.map((g) => ({ id: g.id, userEmail: g.userEmail, role: g.role })),
  };
}

export async function listSharesForResource(resourceType: ResourceType, resourceId: string) {
  const shares = await prisma.share.findMany({
    where: { resourceType, resourceId, revokedAt: null },
    include: { grants: true },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(shares.map(toShareDto));
}

export async function createShare(opts: {
  dataRoomId: string;
  resourceType: ResourceType;
  resourceId: string;
  mode: "PUBLIC" | "PERMISSIONED";
  emails?: string[];
  createdById: string;
}) {
  const share = await prisma.share.create({
    data: {
      dataRoomId: opts.dataRoomId,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      mode: opts.mode,
      token: opts.mode === "PUBLIC" ? randomBytes(16).toString("hex") : null,
      createdById: opts.createdById,
      grants:
        opts.mode === "PERMISSIONED" && opts.emails?.length
          ? { create: opts.emails.map((email) => ({ userEmail: email.toLowerCase().trim() })) }
          : undefined,
    },
    include: { grants: true },
  });
  return toShareDto(share);
}

export async function addGrant(shareId: string, email: string) {
  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share || share.revokedAt) throw new NotFoundError("Share not found");
  await prisma.shareGrant.upsert({
    where: { shareId_userEmail: { shareId, userEmail: email.toLowerCase().trim() } },
    create: { shareId, userEmail: email.toLowerCase().trim() },
    update: {},
  });
  const updated = await prisma.share.findUniqueOrThrow({ where: { id: shareId }, include: { grants: true } });
  return toShareDto(updated);
}

export async function removeGrant(shareId: string, grantId: string) {
  await prisma.shareGrant.deleteMany({ where: { id: grantId, shareId } });
}

export async function revokeShare(shareId: string) {
  await prisma.share.delete({ where: { id: shareId } });
}

export interface SharedItemDto {
  shareId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  dataRoomName: string;
}

export async function listSharedWithMe(userEmail: string): Promise<SharedItemDto[]> {
  const grants = await prisma.shareGrant.findMany({
    where: { userEmail: userEmail.toLowerCase(), share: { revokedAt: null } },
    include: { share: { include: { dataRoom: true } } },
  });
  return Promise.all(
    grants.map(async (grant) => ({
      shareId: grant.share.id,
      resourceType: grant.share.resourceType,
      resourceId: grant.share.resourceId,
      resourceName: await resolveResourceName(grant.share.resourceType, grant.share.resourceId),
      dataRoomId: grant.share.dataRoomId,
      dataRoomName: grant.share.dataRoom.name,
    }))
  );
}
