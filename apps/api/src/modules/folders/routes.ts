import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { assertOwnerAccess, assertViewAccess } from "../../lib/authz";
import { assertFolderNameAvailable } from "../../lib/conflicts";
import { getFolderDeletePreview } from "../../lib/stats";
import { toFolderDto } from "../../lib/dto";
import { BadRequestError } from "../../lib/errors";
import { requireFolder, getFolderContents, deleteFolder } from "./service";

const createSchema = z.object({
  dataRoomId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  name: z.string().trim().min(1).max(200),
});

const renameSchema = z.object({ name: z.string().trim().min(1).max(200) });

export async function folderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.post("/", async (request, reply) => {
    const body = createSchema.parse(request.body);
    let dataRoomId = body.dataRoomId;

    if (body.parentId) {
      const parent = await requireFolder(body.parentId);
      if (parent.dataRoomId !== dataRoomId) {
        throw new BadRequestError("parentId does not belong to dataRoomId");
      }
      dataRoomId = parent.dataRoomId;
    }

    await assertOwnerAccess(dataRoomId, request.user!.id);
    await assertFolderNameAvailable(dataRoomId, body.parentId, body.name);

    const folder = await prisma.folder.create({ data: { dataRoomId, parentId: body.parentId, name: body.name } });
    reply.status(201).send({ folder: toFolderDto(folder) });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const folder = await requireFolder(request.params.id);
    const { isOwner } = await assertViewAccess({
      dataRoomId: folder.dataRoomId,
      folderId: folder.id,
      userId: request.user!.id,
      userEmail: request.user!.email,
    });
    return getFolderContents(folder.id, isOwner);
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const folder = await requireFolder(request.params.id);
    await assertOwnerAccess(folder.dataRoomId, request.user!.id);
    const body = renameSchema.parse(request.body);
    await assertFolderNameAvailable(folder.dataRoomId, folder.parentId, body.name, folder.id);
    const updated = await prisma.folder.update({ where: { id: folder.id }, data: { name: body.name } });
    return { folder: toFolderDto(updated) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const folder = await requireFolder(request.params.id);
    await assertOwnerAccess(folder.dataRoomId, request.user!.id);
    await deleteFolder(folder.id);
    reply.status(204).send();
  });

  app.get<{ Params: { id: string } }>("/:id/delete-preview", async (request) => {
    const folder = await requireFolder(request.params.id);
    await assertOwnerAccess(folder.dataRoomId, request.user!.id);
    return getFolderDeletePreview(folder.id);
  });
}
