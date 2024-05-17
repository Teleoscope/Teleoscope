import PurchaseDisplay from "@/components/PurchaseDisplay";
import { validateRequest } from "@/lib/auth";
import Link from "next/link";


export default async function Purchases() {
  const { user } = await validateRequest()


  return (
    <main>
      <div>
        <h1>Account</h1>
        
        <PurchaseDisplay owner={user!.id} />

        <Link href="/dashboard/purchases">Purchases</Link>

      </div>
    </main>
  );
}

