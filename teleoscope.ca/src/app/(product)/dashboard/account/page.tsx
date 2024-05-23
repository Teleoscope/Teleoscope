import AccountDisplay from "@/components/AccountDisplay";
import Link from "next/link";

export default function Account() {
  return (
    <main>
      <div>
        <h1>Account</h1>
        
        <AccountDisplay />

        <Link href="/dashboard/purchases">Purchases</Link>

      </div>
    </main>
  );
}

