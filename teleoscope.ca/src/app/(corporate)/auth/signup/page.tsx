"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/Authentication";
import { signup } from "@/lib/auth";

export default function AuthenticationPage() {
  return (
    <div className="lg:p-10 max-w-2xl relative w-full  h-full flex flex-col justify-center items-center ">
      <div className="flex pb-2 sm:w-[350px] md:max-w-lg md:w-full justify-end">
        <Link
          href="/auth/signin"
          className={cn(buttonVariants({ variant: "ghost" }), " ")}
        >
          Have an account? Sign in
        </Link>
      </div>
      <div className=" flex w-full p-8  lg:border flex-col justify-between  max-h-[500px] h-full space-y-6 rounded-lg shadow-sm border sm:w-[350px] md:max-w-lg md:w-full">
        <div className="flex flex-col space-y-2 text-center  ">
          <h1 className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to create your account
          </p>
        </div>
        <UserAuthForm onLogin={signup} buttonText="Sign Up with Email" />
        <p className="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
