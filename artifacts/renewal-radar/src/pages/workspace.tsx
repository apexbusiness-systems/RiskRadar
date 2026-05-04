import { useState } from "react";
import { useUser } from "@clerk/react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Users, Mail, Trash2, Settings, Building2, Crown, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner:  { label: "Owner",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: Crown },
  admin:  { label: "Admin",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: Shield },
  member: { label: "Member", color: "text-slate-600",  bg: "bg-slate-100 border-slate-200", icon: User },
};

export default function WorkspacePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  const [inviteEmail, setInviteEmail] = useState("");

  const workspacesQuery = useListWorkspaces({ query: { queryKey: getListWorkspacesQueryKey() } });
  const workspace = workspacesQuery.data?.[0];

  const membersQuery = useListWorkspaceMembers(workspaceId ?? 0, {
    query: { queryKey: getListWorkspaceMembersQueryKey(workspaceId ?? 0), enabled: !!workspaceId },
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
          toast({ title: "Invite sent" });
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-slate-600" />
            </div>
            Workspace
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Manage your organization's workspace settings and team access.
          </p>
        </div>

        {/* Workspace card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-5">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Workspace Details</h2>
          </div>
          <div className="p-6">
            {workspacesQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : workspace ? (
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-black text-xl">
                    {workspace.name[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-xl" data-testid="text-workspace-name">{workspace.name}</p>
                  <p className="text-sm text-slate-400 font-mono mt-0.5">/{workspace.slug}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Created {new Date(workspace.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No workspace found.</p>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-5">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">Team Members</h2>
              {members.length > 0 && (
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {members.length}
                </span>
              )}
            </div>
          </div>

          {/* Invite bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Invite someone</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-xl border-slate-200 bg-white focus-visible:ring-slate-300 h-10"
                data-testid="input-invite-email"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || inviteMember.isPending}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-5 gap-2 shadow-sm flex-shrink-0"
                data-testid="button-invite"
              >
                <Mail className="w-4 h-4" />
                Invite
              </Button>
            </div>
          </div>

          {/* Member list */}
          <div>
            {membersQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center px-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-600 mb-1">No team members yet</p>
                <p className="text-sm text-slate-400">Invite your colleagues using the form above.</p>
              </div>
            ) : (
              members.map((member, idx) => {
                const roleConf = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
                const RoleIcon = roleConf.icon;
                const isCurrentUser = member.clerkUserId === currentUserClerkId;
                const initials = (member.name ?? member.email)[0].toUpperCase();

                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors",
                      idx < members.length - 1 ? "border-b border-slate-100" : "",
                    )}
                    data-testid={`row-member-${member.id}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{member.name ?? member.email}</p>
                        {isCurrentUser && (
                          <span className="text-xs text-slate-400 font-medium">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", roleConf.bg, roleConf.color)}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConf.label}
                      </span>
                      {!isCurrentUser && (
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          onClick={() => handleRemove(member.id)}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Current user */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Your Account</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm font-semibold text-slate-800" data-testid="text-user-email">
                {user?.emailAddresses[0]?.emailAddress}
              </span>
            </div>
            {user?.firstName && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Full name</span>
                <span className="text-sm font-semibold text-slate-800" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
