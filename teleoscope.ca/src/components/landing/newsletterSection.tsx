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
  "bg-primary w-32 border-black text-white hover:text-white hover:shadow-xl hover:bg-black data[data-subscribe-status='not-subscribed']  data[data-subscribe-status='subscribed':animate-bounce]";
const errorStyle = "data[data-subscribe-status='error']";
const successStyle =
  "bg-secondary data[data-subscribe-status='subscribed'] shadow-3xl ";

export default function NewsletterSection() {
  const [formState, formAction] = useFormState(
    subscribeToNewsletter,
    initialState
  );

  return (
    <div className="flex flex-col items-center justify-center w-full  p-10 border-y md:flex-row  ">
      <div className="flex flex-col items-center md:items-start gap-2 w-full  py-2">
        <span className="text-lg text-left font-bold">Stay in the loop</span>
        <span className="max-w-sm text-sm ">
          Stay up to date with the latest developments in research and join our
          community with our newsletter.
        </span>
      </div>
      <form
        className="flex items-center  justify-center py-4 gap-2"
        action={formAction}
      >
        <div className="flex flex-col gap-2  justify-center items-center">
          <div className="flex gap-2  justify-center items-center">
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
            className={`text-xs text-left h-8 w-full ${
              formState.subscribeStatus === "error" && "text-red-600"
            }`}
          >
            {formState.message ? formState.message : <DEFAULT_DISCLAIMER />}
          </span>
        </div>
      </form>
    </div>
  );
}

const DEFAULT_DISCLAIMER = () => {
  return (
    <span className="w-full text-xs h-8 text-left">
      By subscribing, you agree to our{" "}
      <a href="/privacy" className="underline">
        Privacy Policy
      </a>{" "}
      and{" "}
      <a href="/terms" className="underline">
        Terms of Service
      </a>
      .
    </span>
  );
};
