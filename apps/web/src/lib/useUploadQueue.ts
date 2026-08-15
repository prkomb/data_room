import { useCallback, useState } from "react";
import type { FileDto } from "@data-room/shared";
import { fileApi, getApiError } from "./api";

export interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function useUploadQueue(onUploaded: (file: FileDto) => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const enqueue = useCallback(
    (files: File[], dataRoomId: string, folderId: string | null) => {
      for (const file of files) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setTasks((prev) => [...prev, { id, name: file.name, progress: 0, status: "uploading" }]);

        fileApi
          .upload({ dataRoomId, folderId, file }, (pct) => {
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: pct } : t)));
          })
          .then((uploaded) => {
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done", progress: 100 } : t)));
            onUploaded(uploaded);
          })
          .catch((err) => {
            const message = getApiError(err)?.message ?? "Upload failed";
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: message } : t)));
          });
      }
    },
    [onUploaded]
  );

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status === "uploading"));
  }, []);

  return { tasks, enqueue, dismiss, clearFinished };
}
