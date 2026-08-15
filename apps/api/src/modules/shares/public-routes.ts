import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { assertPublicAccess } from "../../lib/authz";
import { ForbiddenError } from "../../lib/errors";
import { toFileDto } from "../../lib/dto";
import { getRoomContents } from "../dataRooms/service";
import { requireFolder, getFolderContents } from "../folders/service";
import { requireFile, getFileViewUrl } from "../files/service";

async function requireActivePublicShare(token: string) {
  const share = await prisma.share.findUnique({ where: { token } });
  if (!share || share.mode !== "PUBLIC" || share.revokedAt) {
    throw new ForbiddenError("This link is invalid or has been revoked");
  }
  return share;
}

export async function publicRoutes(app: FastifyInstance) {
  app.get<{ Params: { token: string } }>("/:token", async (request) => {
    const share = await requireActivePublicShare(request.params.token);

    if (share.resourceType === "DATA_ROOM") {
      const contents = await getRoomContents(share.resourceId, false);
      return { kind: "folder", ...contents };
    }
    if (share.resourceType === "FOLDER") {
      const contents = await getFolderContents(share.resourceId, false);
      return { kind: "folder", ...contents };
    }

    const file = await requireFile(share.resourceId);
    const room = await prisma.dataRoom.findUniqueOrThrow({ where: { id: file.dataRoomId } });
    const viewUrl = await getFileViewUrl(file.storageKey);
    return { kind: "file", file: toFileDto(file), viewUrl, dataRoomName: room.name };
  });

  app.get<{ Params: { token: string; folderId: string } }>("/:token/folders/:folderId", async (request) => {
    const folder = await requireFolder(request.params.folderId);
    await assertPublicAccess({ token: request.params.token, dataRoomId: folder.dataRoomId, folderId: folder.id });
    return getFolderContents(folder.id, false);
  });

  app.get<{ Params: { token: string; fileId: string } }>("/:token/files/:fileId", async (request) => {
    const file = await requireFile(request.params.fileId);
    await assertPublicAccess({
      token: request.params.token,
      dataRoomId: file.dataRoomId,
      folderId: file.folderId,
      fileId: file.id,
    });
    const viewUrl = await getFileViewUrl(file.storageKey);
    return { file: toFileDto(file), viewUrl };
  });
}
