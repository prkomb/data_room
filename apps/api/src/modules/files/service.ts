import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { toFileDto } from "../../lib/dto";
import { getSignedUrl, deleteObjects } from "../../lib/storage";
import { suggestAvailableName } from "../../lib/naming";
import { NotFoundError } from "../../lib/errors";

export async function requireFile(id: string) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new NotFoundError("File not found");
  return file;
}

export function buildStorageKey(dataRoomId: string, fileName: string): string {
  return `${dataRoomId}/${randomUUID()}-${fileName}`;
}

/** Uploads never block on a name clash — they silently take the next available name (Drive-style), unlike rename/move which surface a 409 for the user to resolve explicitly. */
export async function resolveUploadName(dataRoomId: string, folderId: string | null, desired: string): Promise<string> {
  const siblings = await prisma.file.findMany({ where: { dataRoomId, folderId }, select: { name: true } });
  return suggestAvailableName(
    desired,
    siblings.map((s) => s.name)
  );
}

export async function getFileViewUrl(storageKey: string) {
  return getSignedUrl(storageKey);
}

export async function deleteFile(fileId: string, storageKey: string) {
  await deleteObjects([storageKey]).catch(() => {
    // Best-effort cleanup: an orphaned blob is preferable to blocking the delete.
  });
  await prisma.file.delete({ where: { id: fileId } });
}

export { toFileDto };
