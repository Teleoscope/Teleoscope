import { AccountMenu } from "@/components/AccountMenu";
import { validateRequest } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout(
  
  {
    children, // will be a page or nested layout
  }: {
    children: React.ReactNode
  }
) {
  const { user } = await validateRequest();
	if (!user) {
		return redirect("/signin");
	}
  return (
    <section>
      <div className={"flex justify-center"}>
        <AccountMenu />
      </div>
      {children}
    </section>
  )
}