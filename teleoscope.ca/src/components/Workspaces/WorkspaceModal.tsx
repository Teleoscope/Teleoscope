import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { useState } from 'react';

type WorkspaceSettingsProps = {
    id: string;
    name: string;
};

export function WorkspaceSettings(props: WorkspaceSettingsProps) {
    const { id, name } = props;
    const [newName, setNewName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    async function onDelete(id: string) {
        const body = {
            workspace_id: id
        };

        try {
            const response = await fetch(`/api/workspace/delete`, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            mutate(
                (key) =>
                    typeof key === 'string' &&
                    (key.startsWith(`/api/workspace`) ||
                        key.startsWith(`/api/team`))
            );

            setIsOpen(false);

            toast('Workspace deletion requested', {
                description: 'Deleting workspace. May take a few seconds.',
                action: {
                    label: 'refresh',
                    onClick: () => {
                        window.location.reload();
                    }
                }
            });
        } catch (error) {
            toast.error('Failed to create workspace. Please try again.');
        } finally {
        }
    }

    async function onUpdate(id: string, label: string) {
        const body = {
            workspace_id: id,
            label: label
        };

        try {
            const response = await fetch(`/api/workspace/update`, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            mutate(
                (key) =>
                    typeof key === 'string' &&
                    (key.startsWith(`/api/workspace`) ||
                        key.startsWith(`/api/team`))
            );

            setIsOpen(false);

            toast('Workspace name update requested', {
                description: 'Updating workspace name. May take a few seconds.'
            });
        } catch (error) {
            toast.error('Failed to create workspace. Please try again.');
        } finally {
        }
    }

    const handleInputChange = (e) => {
        setNewName(e.target.value); // Update the state with the input value
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(id, newName);
    };
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size={'icon'}
                    className="p-0 w-full h-full"
                >
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
                        <Input
                            onChange={handleInputChange}
                            id="name"
                            defaultValue={name}
                            className="col-span-3"
                        />
                    </div>

                    <Button
                        variant="secondary"
                        type="submit"
                        onClick={handleSubmit}
                    >
                        Save changes
                    </Button>
                </div>
                <section className="grid gap-4 py-4 border-y ">
                    <h5 className=" font-semibold">Danger</h5>
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete this workspace?
                    </p>
                    <p className="text-sm text-gray-500 pb-1">
                        This action cannot be undone. This will permanently
                        delete the workspace and all of its data.
                    </p>
                    <Button
                        size="sm"
                        className="w-fit text-xs"
                        variant="destructive"
                        onClick={() => onDelete(id)}
                    >
                        Delete workspace
                    </Button>
                </section>
            </DialogContent>
        </Dialog>
    );
}
