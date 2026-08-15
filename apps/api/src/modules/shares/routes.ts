import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { assertOwnerAccess } from "../../lib/authz";
import { NotFoundError } from "../../lib/errors";
import {
  assertResourceBelongsToRoom,
  createShare,
  addGrant,
  removeGrant,
  revokeShare,
  listSharesForResource,
  listSharedWithMe,
} from "./service";

const resourceTypeSchema = z.enum(["DATA_ROOM", "FOLDER", "FILE"]);

const listQuerySchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.string().min(1),
});

const createSchema = z.object({
  dataRoomId: z.string().min(1),
  resourceType: resourceTypeSchema,
  resourceId: z.string().min(1),
  mode: z.enum(["PUBLIC", "PERMISSIONED"]),
  emails: z.array(z.string().email()).optional(),
});

const grantSchema = z.object({ email: z.string().email() });

async function resolveDataRoomId(resourceType: "DATA_ROOM" | "FOLDER" | "FILE", resourceId: string): Promise<string> {
  if (resourceType === "DATA_ROOM") return resourceId;
  if (resourceType === "FOLDER") {
    const folder = await prisma.folder.findUnique({ where: { id: resourceId }, select: { dataRoomId: true } });
    if (!folder) throw new NotFoundError("Folder not found");
    return folder.dataRoomId;
  }
  const file = await prisma.file.findUnique({ where: { id: resourceId }, select: { dataRoomId: true } });
  if (!file) throw new NotFoundError("File not found");
  return file.dataRoomId;
}

async function requireShareOwner(shareId: string, userId: string) {
  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) throw new NotFoundError("Share not found");
  await assertOwnerAccess(share.dataRoomId, userId);
  return share;
}

export async function shareRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.get("/shares", async (request) => {
    const query = listQuerySchema.parse(request.query);
    const dataRoomId = await resolveDataRoomId(query.resourceType, query.resourceId);
    await assertOwnerAccess(dataRoomId, request.user!.id);
    const shares = await listSharesForResource(query.resourceType, query.resourceId);
    return { shares };
  });

  app.post("/shares", async (request, reply) => {
    const body = createSchema.parse(request.body);
    await assertOwnerAccess(body.dataRoomId, request.user!.id);
    await assertResourceBelongsToRoom(body.dataRoomId, body.resourceType, body.resourceId);
    const share = await createShare({ ...body, createdById: request.user!.id });
    reply.status(201).send({ share });
  });

  app.post<{ Params: { shareId: string } }>("/shares/:shareId/grants", async (request) => {
    await requireShareOwner(request.params.shareId, request.user!.id);
    const body = grantSchema.parse(request.body);
    const share = await addGrant(request.params.shareId, body.email);
    return { share };
  });

  app.delete<{ Params: { shareId: string; grantId: string } }>("/shares/:shareId/grants/:grantId", async (request, reply) => {
    await requireShareOwner(request.params.shareId, request.user!.id);
    await removeGrant(request.params.shareId, request.params.grantId);
    reply.status(204).send();
  });

  app.delete<{ Params: { shareId: string } }>("/shares/:shareId", async (request, reply) => {
    await requireShareOwner(request.params.shareId, request.user!.id);
    await revokeShare(request.params.shareId);
    reply.status(204).send();
  });

  app.get("/shared-with-me", async (request) => {
    const items = await listSharedWithMe(request.user!.email);
    return { items };
  });
}
