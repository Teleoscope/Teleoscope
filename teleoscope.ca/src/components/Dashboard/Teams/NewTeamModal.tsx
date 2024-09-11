'use client';
import { useUserContext } from '@/context/UserContext';
import { useSWRF } from '@/lib/swr';
import { Teams } from '@/types/teams';
import { Accounts } from '@/types/accounts';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useState } from 'react';
import { mutate } from 'swr';

export default function NewTeamModalWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: accounts } = useSWRF(`/api/accounts`);
    const { data: teams } = useSWRF(`/api/teams`);
    const newteamSchema = z.object({
        label: z
            .string()
            .refine((data) => data.length > 0, {
                message: 'Label must not be empty'
            })
            .refine(
                (data) =>
                    teams?.find((team: Teams) => team.label === data) ===
                    undefined,
                {
                    message:
                        'Team with this label already exists; please choose another'
                }
            ),
        owner: z.string(),
        account: z.enum(
            accounts?.map((a: Accounts) => a._id),
            { message: 'Account must be a valid account' }
        )
    });

    const { user } = useUserContext();
    const form = useForm<z.infer<typeof newteamSchema>>({
        resolver: zodResolver(newteamSchema),
        defaultValues: {
            label: '',
            owner: user._id,
            account: ''
        }
    });

    const handleSubmit = async () => {
        const values = form.getValues();
        const formData = new FormData();

        for (const key in values) {
            formData.append(key, values[key as st]);
        }
        const res = await fetch('/api/teams', {
            method: 'POST',
            body: formData,
        });
        if (res.status === 200) {
            mutate((key) =>
                typeof key === 'string' && (key.startsWith(`/api/workspace`) || key.startsWith(`/api/team`)))
            setIsOpen(false)
            form.reset();
        } else {
            const data = await res.json();
            form.setError('label', { message: data.message });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
            <Button
            variant={'outline'}
            className="border flex-shrink-0 h-40 border-dashed bg-gray-50 rounded-lg flex flex-col w-full justify-center items-center overflow-hidden"
        >
            <div
                className={`w-full flex justify-center items-center text-md p-2 h-40 flex-shrink-0 font-medium gap-2 text-center border-none}`}
            >
                New Team
            </div>
        </Button>
            </DialogTrigger>
            <DialogContent className="px-0 pb-0">
                <DialogHeader className="border-b pb-4 px-4">
                    <DialogTitle>Create a new team</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="w-full space-y-6 p-8 pt-0"
                    >
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Label</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="team label"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The name of the team
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="account"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account</FormLabel>
                                    <FormControl>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an account" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accounts &&
                                                    accounts?.map((account) => (
                                                        <SelectItem
                                                            key={account._id}
                                                            value={account._id}
                                                        >
                                                            {account._id}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormDescription>
                                        The account this team belongs to
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className='w-full'>Create team</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
