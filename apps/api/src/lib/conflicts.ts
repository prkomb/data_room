import { prisma } from "./prisma";
import { ConflictError } from "./errors";
import { suggestAvailableName } from "./naming";

/** Throws ConflictError (with a suggested alternative) if `name` collides case-insensitively with a sibling folder. */
export async function assertFolderNameAvailable(dataRoomId: string, parentId: string | null, name: string, excludeId?: string) {
  const siblings = await prisma.folder.findMany({
    where: { dataRoomId, parentId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { name: true },
  });
  const suggestion = suggestAvailableName(
    name,
    siblings.map((s) => s.name)
  );
  if (suggestion !== name) {
    throw new ConflictError(`A folder named "${name}" already exists here`, suggestion);
  }
}

/** Throws ConflictError (with a suggested alternative) if `name` collides case-insensitively with a sibling file. */
export async function assertFileNameAvailable(dataRoomId: string, folderId: string | null, name: string, excludeId?: string) {
  const siblings = await prisma.file.findMany({
    where: { dataRoomId, folderId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { name: true },
  });
  const suggestion = suggestAvailableName(
    name,
    siblings.map((s) => s.name)
  );
  if (suggestion !== name) {
    throw new ConflictError(`A file named "${name}" already exists here`, suggestion);
  }
}
