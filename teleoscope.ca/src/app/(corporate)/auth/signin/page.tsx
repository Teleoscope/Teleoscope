"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/Authentication";
import { signin } from "@/lib/auth";

export default function SigninPage() {
  return (
    <div className="lg:p-10 max-w-2xl relative w-full  h-full flex flex-col justify-center items-center ">
      <div className="flex pb-2 sm:w-[350px] md:max-w-lg md:w-full justify-end">
        <Link
          href="/auth/signup"
          className={cn(buttonVariants({ variant: "ghost" }), " ")}
        >
          {"Don't have an account? Sign up"}
        </Link>
      </div>
      <div className=" flex w-full p-8  lg:border flex-col justify-between  max-h-[500px] h-full space-y-6 rounded-lg shadow-sm border sm:w-[350px] md:max-w-lg md:w-full">
        <div className="flex flex-col space-y-2 text-center  ">
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        </div>
        <UserAuthForm onLogin={signin} buttonText="Sign In with Email" />
        <p>
        
      </p>
      </div>
     
    </div>
  );
}
