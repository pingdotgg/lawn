"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Folder, Plus, MoreVertical, Trash2, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberInvite } from "@/components/teams/MemberInvite";

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;

  const team = useQuery(api.teams.getBySlug, { slug: teamSlug });
  const projects = useQuery(
    api.projects.list,
    team ? { teamId: team._id } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const deleteProject = useMutation(api.projects.remove);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (team === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (team === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500">Team not found</div>
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsLoading(true);
    try {
      const projectId = await createProject({
        teamId: team._id,
        name: newProjectName.trim(),
      });
      setCreateDialogOpen(false);
      setNewProjectName("");
      router.push(`/dashboard/${teamSlug}/${projectId}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject({ projectId: projectId as any });
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const canManageMembers = team.role === "owner" || team.role === "admin";
  const canCreateProject = team.role !== "viewer";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{team.name}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Projects</p>
          </div>
          <div className="flex gap-2">
            {canManageMembers && (
              <Button variant="outline" onClick={() => setMemberDialogOpen(true)}>
                <Users className="mr-1.5 h-4 w-4" />
                Members
              </Button>
            )}
            {canCreateProject && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New project
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {projects.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-sm text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-2">
                  <Folder className="h-6 w-6 text-zinc-500" />
                </div>
                <CardTitle className="text-lg">No projects yet</CardTitle>
                <CardDescription>
                  Create your first project to start uploading videos.
                </CardDescription>
              </CardHeader>
              {canCreateProject && (
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create project
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <Card
                key={project._id}
                className="group cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => router.push(`/dashboard/${teamSlug}/${project._id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.videoCount} video{project.videoCount !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  {canCreateProject && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Projects help you organize related videos together.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newProjectName.trim() || isLoading}
              >
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canManageMembers && (
        <MemberInvite
          teamId={team._id}
          open={memberDialogOpen}
          onOpenChange={setMemberDialogOpen}
        />
      )}
    </div>
  );
}
