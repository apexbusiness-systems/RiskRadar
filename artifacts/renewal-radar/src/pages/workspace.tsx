import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useListWorkspaces,
  getListWorkspacesQueryKey,
  useListWorkspaceMembers,
  getListWorkspaceMembersQueryKey,
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Trash2, Settings } from "lucide-react";

export default function WorkspacePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user || seeded) return;
    const email = user.emailAddresses[0]?.emailAddress ?? "";
    setSeeded(true);
    fetch("/api/me/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.workspaceId) setWorkspaceId(data.workspaceId); })
      .catch(() => {});
  }, [user, seeded]);

  const workspacesQuery = useListWorkspaces({
    query: { queryKey: getListWorkspacesQueryKey() },
  });
  const workspace = workspacesQuery.data?.[0];

  const membersQuery = useListWorkspaceMembers(workspaceId ?? 0, {
    query: {
      queryKey: getListWorkspaceMembersQueryKey(workspaceId ?? 0),
      enabled: !!workspaceId,
    },
  });

  const inviteMember = useInviteWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();

  const handleInvite = () => {
    if (!workspaceId || !inviteEmail) return;
    inviteMember.mutate(
      { workspaceId, data: { email: inviteEmail, role: "member" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
          toast({ title: "Member invited" });
          setInviteEmail("");
        },
        onError: () => toast({ title: "Failed to invite", variant: "destructive" }),
      },
    );
  };

  const handleRemove = (memberId: number) => {
    if (!workspaceId || !confirm("Remove this member?")) return;
    removeMember.mutate(
      { workspaceId, memberId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
          toast({ title: "Member removed" });
        },
      },
    );
  };

  const members = membersQuery.data ?? [];
  const currentUserClerkId = user?.id;

  const ROLE_STYLES: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800 border-amber-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    member: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Workspace
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your workspace settings and team members.
          </p>
        </div>

        {/* Workspace Info */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Workspace Details</CardTitle>
          </CardHeader>
          <CardContent>
            {workspacesQuery.isLoading ? (
              <Skeleton className="h-10 w-64" />
            ) : workspace ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-semibold text-lg" data-testid="text-workspace-name">{workspace.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Slug</p>
                  <p className="text-sm font-mono text-muted-foreground">{workspace.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workspace found.</p>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invite */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                data-testid="input-invite-email"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || inviteMember.isPending}
                className="gap-2"
                data-testid="button-invite"
              >
                <Mail className="w-4 h-4" />
                Invite
              </Button>
            </div>

            {/* Members list */}
            {membersQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members yet. Invite your team above.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3"
                    data-testid={`row-member-${member.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {(member.name ?? member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name ?? member.email}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs capitalize ${ROLE_STYLES[member.role] ?? ""}`}>
                        {member.role}
                      </Badge>
                      {member.clerkUserId !== currentUserClerkId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(member.id)}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current User Info */}
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium" data-testid="text-user-email">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
              </div>
              {user?.firstName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium" data-testid="text-user-name">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
