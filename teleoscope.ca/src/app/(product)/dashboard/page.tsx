import Link from "next/link";

export default async function Dashboard() {

  return (
    <main>
      <div>
        <h1>Dashboard</h1>
        <Link href="/dashboard/account">Account</Link>
      </div>
    </main>
  );
}
