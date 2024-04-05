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
import { Label } from "@/components/ui/label";
import { CrossCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";

type WorkspaceCollaboratorsProps = {
  id: string;
  name: string;
  contributors: { id: string; username: string }[];
};
export function WorkspaceCollaboratorsModal(
  props: WorkspaceCollaboratorsProps
) {
  const { id, name, contributors } = props;
  const [collaborator, setCollaborator] = useState("");

  const handleDelete = (c) => {
    fetch(`/api/contributors/remove`, {
      method: "POST",
      body: JSON.stringify({ contributor_id: c, workspace_id: id }),
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleKeyDown = (event) => {
    if (
      (event.key === "Return" ||
        event.key === "Enter" ||
        event.keyCode === 13) &&
      coll?.found
    ) {
      fetch(`/api/contributors/add`, {
        method: "POST",
        body: JSON.stringify({ contributor: collaborator, workspace_id: id }),
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const extractUsernameSnippet = (username) => {
    return username.slice(0, 3);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex flex-row  items-center w-full justify-end p-2">
          <Button
            size="icon"
            variant="ghost"
            className="border ml-2 p-0.5 w-6 h-6 z-10 rounded-full bg-neutral-50 text-primary-500 hover:bg-primary-200 hover:text-primary-600"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
          {contributors.slice(0, 3).map((c) => (
            <div
              id={c.id}
              className=" border rounded-full w-8 h-8 p-1 text-xs items-center justify-center flex -ml-2 z-0 bg-neutral-100"
            >
              {extractUsernameSnippet(c.username)}
            </div>
          ))}
          {contributors.length > 3 && (
            <div className=" border rounded-full font-medium w-6 h-6 p-1 text-xs items-center justify-center flex -ml-2 z-0 bg-neutral-100">
              +{contributors.length - 3}
            </div>
          )}
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
            <Label htmlFor="name" className="">
              New collaborator
            </Label>
            <Input
              id="collaborator"
              defaultValue={collaborator}
              className="col-span-3"
            />
          </div>

          <Button disabled={true} variant="secondary" type="submit">
            Add contributor
          </Button>
        </div>
        <section className="grid gap-4 py-4 border-t ">
          <h5 className=" font-semibold">
            Collaborators
            <span className="text-xs text-gray-500">
              {" "}
              ({contributors.length})
            </span>
          </h5>

          <div className="grid grid-cols-1 gap-2  px-1 divide-y divide-y-neutral-200">
            {contributors.map((c) => {
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
