import { AccountMenu } from "@/components/AccountMenu"

export default function DashboardLayout(
  {
    children, // will be a page or nested layout
  }: {
    children: React.ReactNode
  }
) {
  return (
    <section>
      <AccountMenu />
      {children}
    </section>
  )
}