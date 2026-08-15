import { prisma } from "./prisma";
import type { DeletePreviewDto } from "@data-room/shared";

/**
 * Recursive CTE walk of the folder subtree. See README "How it scales" for why this
 * (vs. denormalized counters) is the right default at MVP scale, and what changes later.
 */
export async function getFolderDeletePreview(folderId: string): Promise<DeletePreviewDto> {
  const rows = await prisma.$queryRaw<{ folder_count: bigint; file_count: bigint; total_size: bigint | null }[]>`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM "Folder" f INNER JOIN subtree s ON f."parentId" = s.id
    )
    SELECT
      (SELECT count(*) FROM subtree) - 1 AS folder_count,
      (SELECT count(*) FROM "File" WHERE "folderId" IN (SELECT id FROM subtree)) AS file_count,
      (SELECT COALESCE(SUM(size), 0) FROM "File" WHERE "folderId" IN (SELECT id FROM subtree)) AS total_size
  `;
  const row = rows[0];
  return {
    folderCount: Number(row?.folder_count ?? 0),
    fileCount: Number(row?.file_count ?? 0),
    totalSize: Number(row?.total_size ?? 0),
  };
}

export async function getDataRoomDeletePreview(dataRoomId: string): Promise<DeletePreviewDto> {
  const [folderCount, fileAgg] = await Promise.all([
    prisma.folder.count({ where: { dataRoomId } }),
    prisma.file.aggregate({ where: { dataRoomId }, _count: true, _sum: { size: true } }),
  ]);
  return {
    folderCount,
    fileCount: fileAgg._count,
    totalSize: fileAgg._sum.size ?? 0,
  };
}

/** Collects storage keys for every file in a folder subtree (used to clean up blob storage before DB cascade delete). */
export async function getFolderSubtreeStorageKeys(folderId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ storageKey: string }[]>`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM "Folder" f INNER JOIN subtree s ON f."parentId" = s.id
    )
    SELECT "storageKey" FROM "File" WHERE "folderId" IN (SELECT id FROM subtree)
  `;
  return rows.map((r) => r.storageKey);
}

export async function getDataRoomStorageKeys(dataRoomId: string): Promise<string[]> {
  const files = await prisma.file.findMany({ where: { dataRoomId }, select: { storageKey: true } });
  return files.map((f) => f.storageKey);
}
