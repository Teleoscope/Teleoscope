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
import { Teams, Workspaces } from '@/types';

export function NewWorkspaceModal({ teams = [] }: { teams: Teams[] }) {
    const teamLabels = teams.length > 0 ? teams.map(team => team.label) : [];
    const teamNames = teamLabels.length > 0 ? [teamLabels[0], ...teamLabels.slice(1)] as [string, ...string[]] : [''];

    const FormSchema = z.object({
        label: z.string().min(3, 'Label must be at least 3 characters long'),
        team: z.enum(teamNames)
    });

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            label: 'New workspace',
            team: teamLabels[0] || ''
        }
    });

    async function onSubmit(data: Workspaces) {
        setLoading(true);
        const body = {
            label: form.getValues('label'),
            team: teams[teamNames.indexOf(form.getValues('team'))]?._id.toString() || ''
        };

        try {
            const response = await fetch(`/api/workspaces`, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            setIsOpen(false);
            toast('Workspace creation requested', {
                description: 'Creating new workspace. May take a few seconds.',
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
            setLoading(false);
        }
    }

    if (teams.length === 0) {
        return <>You need at least one team to make a workspace...</>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="secondary"
                    className="p-2 text-primary-500 flex gap-2 items-center hover:bg-primary-200 hover:text-primary-600 border"
                    disabled={!teams.length}
                >
                    <PlusIcon className="w-full" />
                    New workspace
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[90svw] md:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create new workspace</DialogTitle>
                    <DialogDescription>
                        Create a new workspace for an existing team.
                    </DialogDescription>
                </DialogHeader>

                <div>
                    {teams.length === 0 ? (
                        <p>You need at least one team to create a workspace.</p>
                    ) : (
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
                                                    {teams.map((team, i) => (
                                                        <SelectItem
                                                            key={i}
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
                                    variant="default"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create'}
                                </Button>
                            </form>
                        </Form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
