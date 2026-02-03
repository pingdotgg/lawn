"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, Check, UserPlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface MemberInviteProps {
  teamId: Id<"teams">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Role = "admin" | "member" | "viewer";

const roleLabels: Record<Role, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function MemberInvite({ teamId, open, onOpenChange }: MemberInviteProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const members = useQuery(api.teams.getMembers, { teamId });
  const invites = useQuery(api.teams.getInvites, { teamId });
  const inviteMember = useMutation(api.teams.inviteMember);
  const removeMember = useMutation(api.teams.removeMember);
  const updateRole = useMutation(api.teams.updateMemberRole);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const token = await inviteMember({
        teamId,
        email: email.trim(),
        role,
      });
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${baseUrl}/invite/${token}`);
      setEmail("");
    } catch (error) {
      console.error("Failed to invite member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    try {
      await removeMember({ teamId, userId });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleUpdateRole = async (userId: Id<"users">, newRole: Role) => {
    try {
      await updateRole({ teamId, userId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Team members</DialogTitle>
          <DialogDescription>
            Invite new members or manage existing ones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-28">
                  {roleLabels[role]}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRole("admin")}>
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRole("member")}>
                  Member
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRole("viewer")}>
                  Viewer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button type="submit" disabled={!email.trim() || isLoading} className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            {isLoading ? "Sending..." : "Send invite"}
          </Button>
        </form>

        {inviteLink && (
          <div className="border-2 border-[#1a1a1a] bg-[#e8e8e0] p-3">
            <p className="text-sm text-[#888] mb-2">
              Share this link with the invitee:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#1a1a1a]">Current members</h4>
          <div className="space-y-2">
            {members?.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between p-2 border-2 border-[#1a1a1a]"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a]">{member.name}</p>
                    <p className="text-xs text-[#888]">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === "owner" ? (
                    <Badge variant="secondary">Owner</Badge>
                  ) : (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {roleLabels[member.role as Role]}
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member._id, "admin")}
                          >
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member._id, "member")}
                          >
                            Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member._id, "viewer")}
                          >
                            Viewer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#dc2626] hover:text-[#dc2626] hover:bg-[#dc2626]/10"
                        onClick={() => handleRemoveMember(member._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {invites && invites.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[#1a1a1a]">Pending invites</h4>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] bg-[#e8e8e0]"
                >
                  <div>
                    <p className="text-sm text-[#1a1a1a]">{invite.email}</p>
                    <p className="text-xs text-[#888]">
                      Invited as {roleLabels[invite.role]}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
