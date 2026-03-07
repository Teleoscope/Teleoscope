import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CrossCircledIcon, PlusIcon, PersonIcon } from "@radix-ui/react-icons";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";

const FormSchema = z.object({
  workspace_id: z.string(),
  contributor: z.string().email(),
});

type WorkspaceCollaboratorsProps = {
  id: string;
  name: string;
  contributors: { id: string; username: string }[];
};

const MAX_CONTRIBUTORS_DISPLAY = 3;
export function WorkspaceCollaboratorsModal(
  props: WorkspaceCollaboratorsProps
) {
  const { id, name, contributors } = props;
  const [activeContributors, setActiveContributors] = useState(contributors);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      workspace_id: id,
      contributor: "",
    },
  });

  const handleDelete = async (c: string) => {
    if (!activeTeamId) {
      toast("Error removing collaborator", {
        description: "Team id is unavailable for this workspace.",
      });
      return;
    }

    const deleteRequest = await fetch(`/api/users`, {
      method: "DELETE",
      body: JSON.stringify({ userId: c, teamId: activeTeamId }),
      headers: { "Content-Type": "application/json" },
    });

    if (deleteRequest.status !== 200) {
      const data = await deleteRequest.json().catch(() => ({}));
      toast("Error removing collaborator", {
        description:
          data?.error || "There was an error removing the collaborator",
      });
      return;
    }

    toast("Collaborator removed", {
      description: `User ${c} was removed from the workspace`,
    });
    refreshContributors();
  };

  const refreshContributors = async () => {
    const res = await fetch(`/api/workspace?workspace=${id}`);
    if (res.status !== 200) {
      toast("Error fetching collaborators", {
        description: "There was an error fetching the collaborators",
      });
      return;
    }

    const workspace = await res.json();
    const teamId = workspace?.team?.toString?.() || workspace?.team;
    if (!teamId) {
      setActiveContributors([]);
      setActiveTeamId(null);
      return;
    }
    setActiveTeamId(teamId);

    const teamRes = await fetch(`/api/team?team=${teamId}`);
    if (teamRes.status !== 200) {
      toast("Error fetching collaborators", {
        description: "Unable to fetch team collaborators.",
      });
      return;
    }
    const team = await teamRes.json();
    const contributorsFromTeam = [
      { id: `${team.owner}`, username: `${team.owner}` },
      ...(Array.isArray(team.users)
        ? team.users.map((u: { _id: string }) => ({
            id: `${u._id}`,
            username: `${u._id}`,
          }))
        : []),
    ].filter(
      (v, i, a) =>
        v.id && a.findIndex((other) => other.id === v.id) === i
    );

    setActiveContributors(contributorsFromTeam);
  };

  const onSubmit = async () => {
    if (!activeTeamId) {
      await refreshContributors();
    }
    if (!activeTeamId) {
      toast("Error adding collaborator", {
        description: "Team id is unavailable for this workspace.",
      });
      return;
    }

    const contributorEmail = form.getValues().contributor.trim();
    const res = await fetch(
      `/api/users?email=${encodeURIComponent(contributorEmail)}`
    );
    const userRes = await res.json().catch(() => ({}));

    if (res.status !== 200 || userRes.exists !== true) {
      toast("User not found", {
        description: `Email ${contributorEmail} was not found`,
      });
      return;
    }

    const formData = new FormData();
    formData.append("email", contributorEmail);
    formData.append("teamId", activeTeamId);
    const contributorRequest = await fetch(`/api/users`, {
      method: "POST",
      body: formData,
    });

    if (contributorRequest.status !== 200) {
      const data = await contributorRequest.json().catch(() => ({}));
      toast("Error adding collaborator", {
        description: data?.error || "There was an error adding the collaborator",
      });
      return;
    }

    toast("Collaborator added", {
      description: `User ${
        form.getValues().contributor
      } was added to the workspace`,
    });
    refreshContributors();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          refreshContributors();
        }
      }}
    >
      <DialogTrigger asChild>
        <div className="flex flex-row  items-center w-full justify-end ">
          {activeContributors.slice(0, MAX_CONTRIBUTORS_DISPLAY).map((c, i, a) => (
            <div
              id={c.id}
              key={`${c.id}-${i}-contributor`}
              className=" border rounded-full w-8 h-8 p-1 text-2xs items-center justify-center flex -ml-2 z-0 shadow-sm bg-neutral-50"
            >
              <PersonIcon className="w-8 h-8 text-neutral-400" />
            </div>
          ))}
          {activeContributors.length > MAX_CONTRIBUTORS_DISPLAY && (
            <div className=" border rounded-full text-neutral-400 text-2xs w-8 h-8 p-1 text-xs items-center justify-center flex -ml-2 z-0 bg-neutral-50 shadow-sm">
              +{activeContributors.length - 3}
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="border ml-1 p-2 w-8 h-8 z-10 rounded-full bg-white hover:bg-primary-200 hover:text-primary-600 shadow-sm"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[500px] lg:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{name} collaborators</DialogTitle>
          <DialogDescription>
            Add or remove collaborators from this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-center gap-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                <FormField
                  name="contributor"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New collaborator</FormLabel>
                      <FormControl>
                        <Input placeholder="collaborator email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant="secondary" type="submit" className="w-full">
                  Add contributor
                </Button>
              </form>
            </Form>
          </div>
        </div>
        <section className="grid gap-4 py-4 border-t ">
          <h5 className=" font-semibold">
            Collaborators
            <span className="text-xs text-gray-500">
              {" "}
              ({activeContributors.length})
            </span>
          </h5>

          <div className="grid grid-cols-1 gap-2  px-1 divide-y divide-y-neutral-200">
            {activeContributors.map((c, i, a) => {
              return (
                <div key={`${c.id}-${i}-active-contributors`}
                className="flex flex-row gap-4 items-center  py-1 ">
                  <Button
                    className="w-5 h-5 rounded-full p-0
                bg-red-100 text-red-300 hover:bg-red-200 hover:text-red-600
                "
                    size={"icon"}
                    onClick={() => handleDelete(c.id)}
                  >
                    <CrossCircledIcon className="w-full h-full" />
                  </Button>
                  <p>{c.username}</p>
                </div>
              );
            })}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
