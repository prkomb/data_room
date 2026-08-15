import { useEffect, useState, FormEvent } from "react";
import { Copy, Globe, Link2, Trash2, Users } from "lucide-react";
import type { ShareDto } from "@data-room/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareApi, getApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  resourceType: "DATA_ROOM" | "FOLDER" | "FILE";
  resourceId: string;
  resourceName: string;
}

export function ShareDialog({ open, onOpenChange, dataRoomId, resourceType, resourceId, resourceName }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    shareApi
      .listFor(resourceType, resourceId)
      .then(setShares)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) refresh();
  }, [open, resourceType, resourceId]);

  const publicShare = shares.find((s) => s.mode === "PUBLIC" && !s.revokedAt) ?? null;
  const permissionedShare = shares.find((s) => s.mode === "PERMISSIONED" && !s.revokedAt) ?? null;
  const publicLink = publicShare?.token ? `${window.location.origin}/public/${publicShare.token}` : null;

  async function enablePublicLink() {
    setBusy(true);
    try {
      await shareApi.create({ dataRoomId, resourceType, resourceId, mode: "PUBLIC" });
      refresh();
    } catch (err) {
      toast.error(getApiError(err)?.message ?? "Could not create link");
    } finally {
      setBusy(false);
    }
  }

  async function revokePublicLink() {
    if (!publicShare) return;
    setBusy(true);
    try {
      await shareApi.revoke(publicShare.id);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    toast.success("Link copied");
  }

  async function handleAddPerson(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setEmailError(null);
    setBusy(true);
    try {
      if (permissionedShare) {
        await shareApi.addGrant(permissionedShare.id, trimmed);
      } else {
        await shareApi.create({ dataRoomId, resourceType, resourceId, mode: "PERMISSIONED", emails: [trimmed] });
      }
      setEmail("");
      refresh();
    } catch (err) {
      setEmailError(getApiError(err)?.message ?? "Could not add person");
    } finally {
      setBusy(false);
    }
  }

  async function removePerson(grantId: string) {
    if (!permissionedShare) return;
    setBusy(true);
    try {
      await shareApi.removeGrant(permissionedShare.id, grantId);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{resourceName}"</DialogTitle>
          <DialogDescription>Recipients get read-only access.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="public">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="public">
                <Globe className="h-4 w-4" />
                Public link
              </TabsTrigger>
              <TabsTrigger value="people">
                <Users className="h-4 w-4" />
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-3">
              {!publicShare && (
                <div className="flex flex-col items-start gap-2 rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Anyone with the link can view this and its contents.</p>
                  <Button size="sm" onClick={enablePublicLink} disabled={busy}>
                    <Link2 className="h-4 w-4" />
                    Create public link
                  </Button>
                </div>
              )}
              {publicShare && publicLink && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Anyone with this link can view — no account needed.</p>
                  <div className="flex gap-2">
                    <Input readOnly value={publicLink} onFocus={(e) => e.currentTarget.select()} />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="destructive" size="sm" onClick={revokePublicLink} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                    Revoke link
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="people" className="space-y-3">
              <form onSubmit={handleAddPerson} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="person@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={busy}>
                  Share
                </Button>
              </form>
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}

              <div className="divide-y rounded-md border">
                {(!permissionedShare || permissionedShare.grants.length === 0) && (
                  <p className="p-3 text-sm text-muted-foreground">No one else has access yet.</p>
                )}
                {permissionedShare?.grants.map((grant) => (
                  <div key={grant.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{grant.userEmail}</span>
                    <Button variant="ghost" size="icon" onClick={() => removePerson(grant.id)} disabled={busy}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
