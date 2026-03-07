export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";


export default async function Dashboard() {

  redirect("/app/dashboard/workspaces");
}
