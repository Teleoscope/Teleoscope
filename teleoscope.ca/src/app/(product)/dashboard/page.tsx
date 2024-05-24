import Link from "next/link";

export default async function Dashboard() {

  return (
    <main>
      <div>
        <h1>Dashboard</h1>
        
        <p><Link href="/dashboard/account">Account</Link></p>
        <p><Link href="/dashboard/workspaces">Workspaces</Link></p>
        <p><Link href="/dashboard/teams">Teams</Link></p>
        
        <p><Link href="/signout">Sign Out</Link></p>
      </div>
    </main>
  );
}
