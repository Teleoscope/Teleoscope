////////////////////////////////////////////////////////////////////////////////
// layout.tsx
// Teleoscope main app layout
// --------------------------
// @author Paul Bucci
// @year 2024
////////////////////////////////////////////////////////////////////////////////
// <------------------------------- 80 chars -------------------------------> //
// 456789|123456789|123456789|123456789|123456789|123456789|123456789|1234567890
////////////////////////////////////////////////////////////////////////////////

import Menu from "@/components/CorporateMenu"


export default function CorporateLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <Menu />
      {children}
    </section>
  )
}