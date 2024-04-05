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
import { PlusIcon } from "@radix-ui/react-icons";
import { CardContent, Card } from "../ui/card";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormMessage,
  FormControl,
  FormLabel,
  Form,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useState } from "react";

const FormSchema = z.object({
  label: z.string().min(3, "Label must be at least 3 characters long"),
  datasource: z.enum([
    "nursing",
    "aita",
    "github",
    "github-rust-issues",
    "calcom_calcom_issues",
  ]),
});

export function NewWorkspaceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      label: "",
      datasource: "nursing",
    },
  });

  function onSubmit(data) {
    console.log(data);
    console.log(form.getValues());
    fetch(`/api/workspace`, {
      method: "POST",
      body: JSON.stringify(form.getValues()),
      headers: { "Content-Type": "application/json" },
    });
    setIsOpen(false);
    toast("Worskpace creation requested", {
      description: "Creating new workspace. May take a few seconds.",
      action: {
        label: "refresh",
        onClick: () => {
          window.location.reload();
        },
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className=" p-2   text-primary-500 flex gap-2 items-center hover:bg-primary-200 hover:text-primary-600  border "
        >
          <PlusIcon className=" w-full " />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90svw] md:max-w-lg ">
        <DialogHeader>
          <DialogTitle>Create new workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace from an existing data source.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="p-4 text-sm gap-2 flex flex-col">
            <p>
              If you'd like a different subreddit as a data source, email us at{" "}
              <Link
                className="underline text-primary-600"
                href="mailto:hello@teleoscope.ca"
              >
                hello@teleoscope.ca
              </Link>{" "}
              and we may be able to accommodate your request.
            </p>
            <p>
              Subreddits are provided courtesy of{" "}
              <Link
                className="underline text-primary-600"
                href="https://pushshift.io/"
              >
                pushshift.io
              </Link>{" "}
              and are up to date on their schedule, which is roughly within two
              months.
            </p>
          </CardContent>
        </Card>

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
                      <Input placeholder="workspace label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="datasource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Source</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          value="
                        nursing"
                        >
                          r/nursing
                        </SelectItem>
                        <SelectItem value="aita">r/AmITheAsshole</SelectItem>
                        <SelectItem value="github">r/github</SelectItem>
                        <SelectItem value="github-rust-issues">
                          r/rust issues
                        </SelectItem>
                        <SelectItem value="calcom_calcom_issues">
                          r/calcom_calcom issues
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                className="w-full bg-primary-600 text-white"
                variant={"default"}
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
