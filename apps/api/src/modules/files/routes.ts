import { FastifyInstance } from "fastify";
import { z } from "zod";
import { MultipartFile } from "@fastify/multipart";
import { prisma } from "../../lib/prisma";
import { assertOwnerAccess, assertViewAccess } from "../../lib/authz";
import { assertFileNameAvailable } from "../../lib/conflicts";
import { toFileDto } from "../../lib/dto";
import { BadRequestError } from "../../lib/errors";
import { uploadObject } from "../../lib/storage";
import { requireFolder } from "../folders/service";
import { requireFile, resolveUploadName, buildStorageKey, getFileViewUrl, deleteFile } from "./service";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  folderId: z.string().min(1).nullable().optional(),
});

export async function fileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireAuth);

  app.post("/", async (request, reply) => {
    let dataRoomId: string | undefined;
    let folderId: string | null = null;
    let fileBuffer: Buffer | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        const filePart = part as MultipartFile;
        fileBuffer = await filePart.toBuffer();
        fileName = filePart.filename;
        mimeType = filePart.mimetype;
      } else if (part.fieldname === "dataRoomId") {
        dataRoomId = String(part.value);
      } else if (part.fieldname === "folderId") {
        folderId = String(part.value);
      }
    }

    if (!dataRoomId || !fileBuffer || !fileName) {
      throw new BadRequestError("dataRoomId and file are required");
    }

    if (folderId) {
      const folder = await requireFolder(folderId);
      if (folder.dataRoomId !== dataRoomId) throw new BadRequestError("folderId does not belong to dataRoomId");
    }

    await assertOwnerAccess(dataRoomId, request.user!.id);

    const finalName = await resolveUploadName(dataRoomId, folderId, fileName);
    const storageKey = buildStorageKey(dataRoomId, finalName);
    await uploadObject(storageKey, fileBuffer, mimeType ?? "application/octet-stream");

    const file = await prisma.file.create({
      data: {
        dataRoomId,
        folderId,
        name: finalName,
        size: fileBuffer.length,
        mimeType: mimeType ?? "application/octet-stream",
        storageKey,
      },
    });
    reply.status(201).send({ file: toFileDto(file) });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const file = await requireFile(request.params.id);
    await assertViewAccess({
      dataRoomId: file.dataRoomId,
      folderId: file.folderId,
      fileId: file.id,
      userId: request.user!.id,
      userEmail: request.user!.email,
    });
    const viewUrl = await getFileViewUrl(file.storageKey);
    return { file: toFileDto(file), viewUrl };
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const file = await requireFile(request.params.id);
    await assertOwnerAccess(file.dataRoomId, request.user!.id);
    const body = updateSchema.parse(request.body);

    let targetFolderId = file.folderId;
    if (body.folderId !== undefined) {
      if (body.folderId) {
        const folder = await requireFolder(body.folderId);
        if (folder.dataRoomId !== file.dataRoomId) throw new BadRequestError("Target folder is in a different data room");
      }
      targetFolderId = body.folderId;
    }

    const targetName = body.name ?? file.name;
    if (body.name !== undefined || body.folderId !== undefined) {
      await assertFileNameAvailable(file.dataRoomId, targetFolderId, targetName, file.id);
    }

    const updated = await prisma.file.update({
      where: { id: file.id },
      data: { name: targetName, folderId: targetFolderId },
    });
    return { file: toFileDto(updated) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const file = await requireFile(request.params.id);
    await assertOwnerAccess(file.dataRoomId, request.user!.id);
    await deleteFile(file.id, file.storageKey);
    reply.status(204).send();
  });
}
