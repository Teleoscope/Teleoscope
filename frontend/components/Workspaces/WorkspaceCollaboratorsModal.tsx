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
} from "../ui/form";
import { toast } from "sonner";
import { useState } from "react";

const FormSchema = z.object({
  workspace_id: z.string(),
  contributor: z.string(),
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
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      workspace_id: id,
      contributor: "",
    },
  });

  const handleDelete = async (c) => {
    const deleteRequest = await fetch(`/api/contributors/remove`, {
      method: "POST",
      body: JSON.stringify({ contributor_id: c, workspace_id: id }),
      headers: { "Content-Type": "application/json" },
    });

    if (deleteRequest.status !== 200) {
      toast("Error removing collaborator", {
        description: "There was an error removing the collaborator",
      });
      return;
    }

    toast("Collaborator removed", {
      description: `User ${c} was removed from the workspace`,
    });
    refreshContributors();
  };

  const refreshContributors = async () => {
    const res = await fetch(`/api/workspaces/${id}`);
    if (res.status !== 200) {
      toast("Error fetching collaborators", {
        description: "There was an error fetching the collaborators",
      });
      return;
    }
    const { contributors } = await res.json();
    setActiveContributors(contributors);
  };

  const onSubmit = async () => {
    const res = await fetch(`/api/users/${form.getValues().contributor}`);
    const userRes = await res.json();

    if (res.status === 404 || userRes.found === false) {
      toast("User not found", {
        description: `Username ${form.getValues().contributor} was not found`,
      });
      return;
    }

    const contributorRequest = await fetch(`/api/contributors/add`, {
      method: "POST",
      body: JSON.stringify(form.getValues()),
      headers: { "Content-Type": "application/json" },
    });

    if (contributorRequest.status !== 200) {
      toast("Error adding collaborator", {
        description: "There was an error adding the collaborator",
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
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex flex-row  items-center w-full justify-end p-2">
          {activeContributors.slice(0, MAX_CONTRIBUTORS_DISPLAY).map((c) => (
            <div
              id={c.id}
              className=" border rounded-full w-6 h-6 p-1 text-2xs items-center justify-center flex -ml-2 z-0 shadow-sm bg-neutral-50"
            >
              <PersonIcon className="w-6 h-6 text-neutral-400" />
            </div>
          ))}
          {activeContributors.length > MAX_CONTRIBUTORS_DISPLAY && (
            <div className=" border rounded-full text-neutral-400 text-2xs w-6 h-6 p-1 text-xs items-center justify-center flex -ml-2 z-0 bg-neutral-50 shadow-sm">
              +{activeContributors.length - 3}
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="border ml-1 p-0.5 w-6 h-6 z-10 rounded-full bg-white text-primary-500 hover:bg-primary-200 hover:text-primary-600 shadow-sm"
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
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-6"
              >
                <FormField
                  name="contributor"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New collaborator</FormLabel>
                      <FormControl>
                        <Input placeholder="collaborator username" {...field} />
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
            {activeContributors.map((c) => {
              return (
                <div className="flex flex-row gap-4 items-center  py-1 ">
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
