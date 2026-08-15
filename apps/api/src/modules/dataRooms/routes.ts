import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { assertOwnerAccess, assertViewAccess } from "../../lib/authz";
import { getDataRoomDeletePreview } from "../../lib/stats";
import { toFolderDto, toFileDto } from "../../lib/dto";
import { toDataRoomDto, requireDataRoom, getRoomContents, deleteDataRoom } from "./service";

const nameSchema = z.object({ name: z.string().trim().min(1).max(200) });
const searchSchema = z.object({ q: z.string().trim().min(1) });

export async function dataRoomRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/", async (request) => {
    const rooms = await prisma.dataRoom.findMany({
      where: { ownerId: request.user!.id },
      orderBy: { updatedAt: "desc" },
    });
    return { dataRooms: rooms.map(toDataRoomDto) };
  });

  app.post("/", async (request, reply) => {
    const body = nameSchema.parse(request.body);
    const room = await prisma.dataRoom.create({ data: { name: body.name, ownerId: request.user!.id } });
    reply.status(201).send({ dataRoom: toDataRoomDto(room) });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const room = await requireDataRoom(request.params.id);
    await assertViewAccess({ dataRoomId: room.id, userId: request.user!.id, userEmail: request.user!.email });
    return { dataRoom: toDataRoomDto(room) };
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    await assertOwnerAccess(request.params.id, request.user!.id);
    const body = nameSchema.parse(request.body);
    const room = await prisma.dataRoom.update({ where: { id: request.params.id }, data: { name: body.name } });
    return { dataRoom: toDataRoomDto(room) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await assertOwnerAccess(request.params.id, request.user!.id);
    await deleteDataRoom(request.params.id);
    reply.status(204).send();
  });

  app.get<{ Params: { id: string } }>("/:id/delete-preview", async (request) => {
    await assertOwnerAccess(request.params.id, request.user!.id);
    return getDataRoomDeletePreview(request.params.id);
  });

  app.get<{ Params: { id: string } }>("/:id/contents", async (request) => {
    const { isOwner } = await assertViewAccess({
      dataRoomId: request.params.id,
      userId: request.user!.id,
      userEmail: request.user!.email,
    });
    return getRoomContents(request.params.id, isOwner);
  });

  app.get<{ Params: { id: string }; Querystring: { q?: string } }>("/:id/search", async (request) => {
    await assertViewAccess({ dataRoomId: request.params.id, userId: request.user!.id, userEmail: request.user!.email });
    const { q } = searchSchema.parse(request.query);
    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { dataRoomId: request.params.id, name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 50,
      }),
      prisma.file.findMany({
        where: { dataRoomId: request.params.id, name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 50,
      }),
    ]);
    return { folders: folders.map(toFolderDto), files: files.map(toFileDto) };
  });
}
