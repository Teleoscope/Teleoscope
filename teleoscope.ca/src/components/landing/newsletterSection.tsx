"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToNewsletter } from "./actions";
import { useFormState } from "react-dom";
import { cn } from "@/lib/utils";

type SubscribeStatus = "not subscribed" | "subscribed" | "error";

const initialState: { subscribeStatus: SubscribeStatus; message?: string } = {
  subscribeStatus: "not subscribed",
};
const defaultStyle =
  "bg-black w-32 border-black text-white hover:text-white hover:shadow-xl hover:bg-black data[data-subscribe-status='not-subscribed']  data[data-subscribe-status='subscribed':animate-bounce]";
const errorStyle = "border-red-500  data[data-subscribe-status='error']";
const successStyle =
  "bg-pink-600  data[data-subscribe-status='subscribed'] hover:bg-bg-pink-600 shadow-3xl shadow-[0_4px_8px_0_rgba(255,192,203,0.6)]";

export default function NewsletterSection() {
  const [formState, formAction] = useFormState(
    subscribeToNewsletter,
    initialState
  );

  return (
    <div className="flex items-center justify-between w-full  p-10 border-y ">
      <div className="flex flex-col  gap-2 w-full  py-2">
        <span className="text-lg font-bold">Stay in the loop</span>
        <span className="max-w-sm text-sm ">
          Stay up to date with the latest developments in research and join our
          community with our newsletter.
        </span>
      </div>
      <form
        className="flex items-center justify-end py-4 gap-2"
        action={formAction}
      >
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              name="email"
              type="email"
              id="email"
              placeholder="Jane@doe.com"
              className="w-60 bg-neutral-50 min-w-fit"
            />
            <input
              hidden
              type="text"
              name="b_f82f50bbaace79444ae64c7c0_4143f228c5"
            />
            <Button
              className={cn(
                defaultStyle,
                formState.subscribeStatus === "error" && errorStyle,
                formState.subscribeStatus === "subscribed" && successStyle
              )}
              type="submit"
            >
              {formState.subscribeStatus === "subscribed"
                ? "Subscribed"
                : "Subscribe"}
            </Button>
          </div>
          <span
            className={`text-xs h-8 ${
              formState.subscribeStatus === "error" && "text-red-500"
            }`}
          >
            {formState.message}
          </span>
        </div>
      </form>
    </div>
  );
}
