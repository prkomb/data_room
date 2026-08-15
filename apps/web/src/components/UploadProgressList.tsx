import { CheckCircle2, AlertCircle, X, FileText } from "lucide-react";
import type { UploadTask } from "@/lib/useUploadQueue";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function UploadProgressList({ tasks, onDismiss }: { tasks: UploadTask[]; onDismiss: (id: string) => void }) {
  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
      <div className="border-b px-3 py-2 text-sm font-medium">
        Uploading {tasks.filter((t) => t.status === "uploading").length || tasks.length} file
        {tasks.length === 1 ? "" : "s"}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium">{task.name}</p>
                {task.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                {task.status === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
              </div>
              {task.status === "uploading" && <Progress value={task.progress} className="mt-1.5 h-1" />}
              {task.status === "error" && <p className="mt-0.5 text-xs text-destructive">{task.error}</p>}
            </div>
            {task.status !== "uploading" && (
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onDismiss(task.id)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
