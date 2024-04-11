import Menu from "@/components/CorporateMenu"

export default function DashboardLayout(
  {
    children, // will be a page or nested layout
  }: {
    children: React.ReactNode
  }
) {
  return (
    <section>
      <Menu />
      {children}
    </section>
  )
}