"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserContext } from "@/context/UserContext";
import { useContext } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"


const formSchema = z.object({
  firstName: z.string().refine((v) => v.trim().length > 0, {
    message: "First name is required and cannot be empty.",
  }),
  lastName: z.string().refine((v) => v.trim().length > 0, {
    message: "Last name is required and cannot be empty.",
  }),
});


export default function AccountSettings() {
  const { user } = useContext(UserContext);
  const form = useForm<z.infer<typeof formSchema>>
  ({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
    },
    mode: "onBlur",
  });

  async function onSubmit() {
    const { firstName, lastName } = form.getValues();
    // Update user
    // await fetch(`/api/users/${user._id}`, {
    //   method: "PATCH",
    //   body: JSON.stringify({ firstName, lastName }),
    // });
  }

  return (
    <div className="flex flex-col gap-10 p-10 ">
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Account Settings</h2>
        <p>Update your account information.</p>

        <Form {...form}>
          <form className="flex flex-col gap-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
            <h3 className="text-lg font-semibold">Profile</h3>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 py-1">
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />
            <FormField
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
            <Button variant={"outline"}
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
              >Cancel</Button>
            <Button type="submit"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
            >Save</Button>
          </div>
          </form>
          
        </Form>
        {/* <section className="flex flex-col gap-4 py-4">
          <h3 className="text-lg font-semibold">Security</h3>
          <section className="flex items-center gap-4 py-4">
            <Label>Password</Label>
            <Button variant={"outline"} className=" w-fit">
              Change Password
            </Button>
          </section>
        </section> */}
      </section>
    </div>
  );
}
