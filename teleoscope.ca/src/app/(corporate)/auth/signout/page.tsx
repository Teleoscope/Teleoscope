// signout/page.tsx
"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signout } from "@/lib/auth";

export default function SignOut() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Call signout only on the client side
      signout();
    }
  }, []);

  return (
    <main>
      <div className="flex items-center justify-center p-4">
        <div>
          <h1 className="text-3xl font-bold">Signing Out...</h1>
          <h2>Click below if you are not automatically signed out...</h2>
          <Button onClick={() => signout()}>Sign Out</Button>
        </div>
      </div>
    </main>
  );
}
