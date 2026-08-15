import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderLock, MoreVertical, Trash2, Pencil } from "lucide-react";
import type { DataRoomDto } from "@data-room/shared";
import { dataRoomApi } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NameDialog } from "@/components/NameDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<DataRoomDto[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<DataRoomDto | null>(null);
  const [deleting, setDeleting] = useState<DataRoomDto | null>(null);
  const navigate = useNavigate();

  function refresh() {
    dataRoomApi.list().then(setRooms);
  }

  useEffect(refresh, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Rooms</h1>
          <p className="text-sm text-muted-foreground">Secure repositories for your due-diligence documents.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New data room
        </Button>
      </div>

      {rooms === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {rooms?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
          <FolderLock className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No data rooms yet</p>
          <p className="mb-4 text-sm text-muted-foreground">Create one to start organizing due-diligence documents.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New data room
          </Button>
        </div>
      )}

      {rooms && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <FolderLock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    <CardDescription>Updated {formatDate(room.updatedAt)}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setRenaming(room)}>
                      <Pencil className="h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onClick={() => setDeleting(room)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <NameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New data room"
        label="Name"
        submitLabel="Create"
        onSubmit={async (name) => {
          const room = await dataRoomApi.create(name);
          toast.success(`"${room.name}" created`);
          refresh();
          navigate(`/rooms/${room.id}`);
        }}
      />

      {renaming && (
        <NameDialog
          open={!!renaming}
          onOpenChange={(open) => !open && setRenaming(null)}
          title="Rename data room"
          label="Name"
          initialValue={renaming.name}
          onSubmit={async (name) => {
            await dataRoomApi.rename(renaming.id, name);
            refresh();
          }}
        />
      )}

      {deleting && (
        <DeleteConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          itemName={deleting.name}
          loadPreview={() => dataRoomApi.deletePreview(deleting.id)}
          onConfirm={async () => {
            await dataRoomApi.remove(deleting.id);
            toast.success(`"${deleting.name}" deleted`);
            refresh();
          }}
        />
      )}
    </AppShell>
  );
}
