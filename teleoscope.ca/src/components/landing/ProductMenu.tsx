import Link from "next/link";
import { cn } from "@/lib/utils";
// Dashboard
// Account
// Workspaces
// Teams
// Sign Out
const menuItems = [
  {
    label: "Dashboard",
    href: "/app/dashboard",
  },
  {
    label: "Account",
    href: "/app/dashboard/account",
  },
  {
    label: "Teams",
    href: "/app/dashboard/teams",
  },
  {
    label: "Workspaces",
    href: "/app/dashboard/workspaces",
    variant: "primary",
  },
  {
    label: "Resources",
    href: "/app/resources",
  },
  {
    label: "Sign Out",
    href: "/signout",
  },
];

export default function Menu() {
  const menuStyle = "flex items-center justify-between px-2 gap-4";
  const menuItemStyle =
    "flex-shrink-0 p-2 font-medium text-neutral-900 rounded hover:bg-neutral-100";
  const menuItemPrimaryStyle =
    "flex-shrink-0  bg-neutral-900 text-white rounded p-2 font-medium hover:bg-neutral-800";

  return (
    <div className="flex items-center justify-between">
      <div className="flex-shrink-0 p-4 font-bold">
        <Link href="/" passHref className="hover:text-pink-600 ">
          Teleoscope
        </Link>
      </div>
      <section>
        <div className={menuStyle}>
          {menuItems.map((item) => (
            <div key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  menuItemStyle,
                  item.variant === "primary" && menuItemPrimaryStyle
                )}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
