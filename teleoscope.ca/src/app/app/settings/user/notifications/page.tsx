'use client';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
    emailNotifications: z.boolean(),
    newsletter: z.boolean()
});

export default function NotificationSettings() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            emailNotifications: true,
            newsletter: true
        },
        mode: 'onBlur'
    });

    async function onSubmit() {}

    return (
        <div className="flex flex-col gap-10 p-10 ">
            <section className="flex flex-col gap-4">
                <h2 className="text-2xl font-semibold">
                    Notification Settings
                </h2>

                <Form {...form}>
                    <form
                        className="flex flex-col gap-4 py-4"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FormField
                            control={form.control}
                            disabled={true}
                            name="emailNotifications"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-2 py-1">
                                    <FormLabel className="font-medium text-md">
                                        Email Notifications
                                    </FormLabel>

                                    <div className=" flex gap-2 items-center leading-none">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Send email notifications
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            disabled={true}
                            name="newsletter"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-2 py-1">
                                    <FormLabel className="font-medium text-md">
                                        Teleoscope Tips and Newsletter
                                    </FormLabel>

                                    <div className=" flex gap-2 items-center leading-none">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Send me occasional emails with
                                            updates and promotions for
                                            Teleoscope
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end w-full gap-4">
                            <Button
                                variant={'outline'}
                                onClick={() => form.reset()}
                                disabled={
                                    true ||
                                    !form.formState.isDirty ||
                                    form.formState.isSubmitting
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    true ||
                                    !form.formState.isDirty ||
                                    form.formState.isSubmitting
                                }
                            >
                                Save
                            </Button>
                        </div>
                    </form>
                </Form>
            </section>
        </div>
    );
}
