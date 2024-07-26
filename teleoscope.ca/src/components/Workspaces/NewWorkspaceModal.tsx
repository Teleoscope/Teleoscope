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
import { PlusIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import {
    FormField,
    FormItem,
    FormMessage,
    FormControl,
    FormLabel,
    Form
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Teams } from '@/types/teams';
import { Workspaces } from '@/types/workspaces';

export function NewWorkspaceModal({ teams }: { teams: Array<Teams> }) {
    

    const teamLabels: string[] = teams?.map((team: Teams) => team.label);
    const teamNames: [string, ...string[]] = [
        teamLabels[0],
        ...teamLabels.slice(1)
    ];

    const FormSchema = z.object({
        label: z.string().min(3, 'Label must be at least 3 characters long'),
        team: z.enum(teamNames)
    });

    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            label: 'New workspace',
            team: teamLabels[0]
        }
    });

    function onSubmit(data: Workspaces) {
        const body = {
            label: form.getValues()['label'],
            team: teams[
                teamNames.indexOf(form.getValues()['team'])
            ]._id?.toString()
        };

        fetch(`/api/workspaces`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });
        setIsOpen(false);
        toast('Worskpace creation requested', {
            description: 'Creating new workspace. May take a few seconds.',
            action: {
                label: 'refresh',
                onClick: () => {
                    window.location.reload();
                }
            }
        });
    }

    if (!teams) {
        return <>You need at least one team to make a workspace...</>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    className=" p-2 text-primary-500 flex gap-2 items-center hover:bg-primary-200 hover:text-primary-600  border "
                >
                    <PlusIcon className=" w-full " />
                    New workspace
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[90svw] md:max-w-lg ">
                <DialogHeader>
                    <DialogTitle>Create new workspace</DialogTitle>
                    <DialogDescription>
                        Create a new workspace for an existing team.
                    </DialogDescription>
                </DialogHeader>

                <div className="">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="w-full space-y-6"
                        >
                            <FormField
                                name="label"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Label</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="workspace label"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="team"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Team</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a team" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {teams.map((team: Teams, i, a) => (
                                                    <SelectItem
                                                        key={`${i}-team-select`}
                                                        value={team.label}
                                                    >
                                                        {team.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                className="w-full bg-primary-600 text-black"
                                variant={'default'}
                                type="submit"
                            >
                                Create
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
