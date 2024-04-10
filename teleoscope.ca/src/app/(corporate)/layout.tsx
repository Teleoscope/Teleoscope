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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Menu from "@/components/CorporateMenu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Teleoscope",
  description: "AI assisted qualitative analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Menu></Menu>
        {children}
      </body>
    </html>
  );
}
