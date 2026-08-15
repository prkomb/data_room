import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Folder as FolderIcon, FolderLock, Users } from "lucide-react";
import { shareApi, type SharedItemDto } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ICONS = { DATA_ROOM: FolderLock, FOLDER: FolderIcon, FILE: FileText } as const;

export default function SharedWithMePage() {
  const [items, setItems] = useState<SharedItemDto[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    shareApi.sharedWithMe().then(setItems);
  }, []);

  function open(item: SharedItemDto) {
    if (item.resourceType === "DATA_ROOM") navigate(`/rooms/${item.resourceId}`);
    else if (item.resourceType === "FOLDER") navigate(`/rooms/${item.dataRoomId}/folders/${item.resourceId}`);
    else navigate(`/rooms/${item.dataRoomId}?file=${item.resourceId}`);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Shared with me</h1>
        <p className="text-sm text-muted-foreground">Items others have given you read-only access to.</p>
      </div>

      {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {items?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nothing shared with you yet</p>
          <p className="text-sm text-muted-foreground">Items someone shares with your account will show up here.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.resourceType];
            return (
              <Card key={item.shareId} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => open(item)}>
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{item.resourceName}</CardTitle>
                    <CardDescription>in {item.dataRoomName}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
