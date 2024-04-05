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
import { DotsVerticalIcon } from "@radix-ui/react-icons";

type WorkspaceSettingsProps = {
  id: string;
  name: string;
};
export function WorkspaceSettings(props: WorkspaceSettingsProps) {
  const { id, name } = props;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <DotsVerticalIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[500px] lg:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
          <DialogDescription>
            Make changes to your workspace here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-center gap-4">
            <Label htmlFor="name" className="">
              Workspace name
            </Label>
            <Input id="name" defaultValue={name} className="col-span-3" />
          </div>

          <Button disabled={true} variant="secondary" type="submit">
            Save changes
          </Button>
        </div>
        <section className="grid gap-4 py-4 border-y ">
          <h5 className=" font-semibold">Danger</h5>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this workspace?
          </p>
          <p className="text-sm text-gray-500 pb-1">
            This action cannot be undone. This will permanently delete the
            workspace and all of its data.
          </p>
          <Button
            disabled={true}
            size="sm"
            className="w-fit text-xs"
            variant="destructive"
          >
            Delete workspace
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}
