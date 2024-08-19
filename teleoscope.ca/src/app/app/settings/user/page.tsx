'use client';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserContext } from '@/context/UserContext';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSWRF } from '@/lib/swr';
import { Accounts } from '@/types/accounts';
import Link from "next/link";

const formSchema = z.object({
    firstName: z.string().refine((v) => v.trim().length > 0, {
        message: 'First name is required and cannot be empty.'
    }),
    lastName: z.string().refine((v) => v.trim().length > 0, {
        message: 'Last name is required and cannot be empty.'
    })
});

export default function AccountSettings() {
    const { user, account } = useContext(UserContext);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: user.firstName,
            lastName: user.lastName
        },
        mode: 'onBlur'
    });

    async function onSubmit() {
        // TODO: Backend to support updating user information
        //   const { firstName, lastName } = form.getValues();
        //   // Update user
        //   // await fetch(`/api/users/${user._id}`, {
        //   //   method: "PATCH",
        //   //   body: JSON.stringify({ firstName, lastName }),
        //   // });
    }

    if (!account) {
        return <div></div>;
    }

    return (
        <div className="flex flex-col gap-10 p-10  ">
            <section className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">Account Settings</h2>
                <p>Update your account information.</p>

                <Form {...form}>
                    <form
                        className="flex flex-col gap-4 py-4"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <h3 className="text-lg font-semibold">Profile</h3>
                        <FormField
                            control={form.control}
                            disabled={true}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-2 py-1">
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            disabled={true}
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-2 py-1">
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <section className="flex flex-col gap-2 py-1">
                            <Label>Email</Label>
                            <Input disabled value={user.emails} />
                        </section>
                        <div className="flex justify-end w-full gap-4">
                            <Button
                                variant={'outline'}
                                onClick={() => form.reset()}
                                disabled={
                                    !form.formState.isDirty ||
                                    form.formState.isSubmitting
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !form.formState.isDirty ||
                                    form.formState.isSubmitting
                                }
                            >
                                Save
                            </Button>
                        </div>
                    </form>
                </Form>
                <section className="flex flex-col gap-4 py-2">
                    <h3 className="text-lg font-semibold">Security</h3>
                    <section className="flex items-center gap-4 py-4">
                        <Label>Password</Label>
                        <Button variant={'outline'} className=" w-fit">
                            Change Password
                        </Button>
                    </section>
                </section>

                <section className="flex flex-col gap-2 py-4">
                    <h3 className="text-lg font-semibold">
                        Upgrade Teleoscope Plan
                    </h3>
                    <section className="flex flex-col text-sm  gap-4 ">
                        <details className={"flex flex-col w-fit max-w-md bg-neutral-50  border rounded-lg gap-4"}>
                            <summary className="text-primary border-b cursor-pointer p-2 ">
                                Current plan: {account.plan.name}
                            </summary>
                            <ul className="flex flex-col px-4 p-2 gap-2">
                                <li>{account.plan.plan_storage_amount} GB Storage</li>
                                <li>{account.plan.plan_team_amount} Teams</li>
                                <li>{account.plan.plan_collaborator_amount} Collaborators</li>
                            </ul>
                        </details>
                    </section>
                    <div className="flex items-center gap-4 py-1">
                        <Label>
                            Upgrade plan to expand collaboration and storage
                        </Label>
                        <Link className=" border bg-appPrimary-600 p-1 px-2 text-white rounded-md flex items-center w-fit"
                                href="/pricing">
                            View Plans</Link>
                    </div>

                </section>
                <section className="flex flex-col gap-4 py-4">
                    <h3 className="text-lg font-semibold">
                        Change/Cancel Plan
                    </h3>


                    <Button variant={'outline'} className=" w-fit text-primary"
                            disabled={true}>

                        Cancel your Teleoscope Subscription
                    </Button>
                    <span className="text-neutral-600 text-sm">
                        At this time, you can only cancel your subscription by contacting support.
                    </span>
                </section>
            </section>
        </div>
    );
}
