import AccountDisplay from "@/components/AccountDisplay";
import { validateRequest } from "@/lib/auth";
import Link from "next/link";


export default async function Account() {
  const { user } = await validateRequest()


  return (
    <main>
      <div>
        <h1>Account</h1>
        
        <AccountDisplay owner={user!.id} />

        <Link href="/dashboard/purchases">Purchases</Link>

      </div>
    </main>
  );
}

