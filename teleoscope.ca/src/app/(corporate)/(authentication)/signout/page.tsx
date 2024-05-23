import { Button } from "@/components/ui/button";
import { signout } from "@/lib/auth";

export default function SignOut() {
    
    return (
      <main>
        <div className="flex items-center justify-center p-4">
          <h1 className="text-3xl font-bold">Sign Out</h1>
        </div>
          <Button onClick={(e) => signout()}>Sign Out</Button>
      </main>
    );
  }
  