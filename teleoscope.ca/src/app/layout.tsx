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
import { Raleway } from "next/font/google";
import "@/app/globals.css";

const railwayFont = Raleway({ subsets: ["latin"] });

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
      <body className={railwayFont.className}>
        {children}
      </body>
    </html>
  );
}
