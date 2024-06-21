"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    label: "How It Works",
    href: "/about",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Resources",
    href: "https://teleoscope.ca/",
  },
  {
    label: "Sign In",
    href: "/signin",
  },
  {
    label: "Get Started",
    href: "/signup",
    variant: "primary"
  },
];


export default function Menu() {
  const menuStyle = "flex items-center justify-between px-2 gap-4";
  const menuItemStyle = "flex-shrink-0 p-2 font-medium";
  const meneItemPrimaryStyle = "flex-shrink-0  bg-pink-600 text-white rounded-sm";

  return (
    <div className="flex items-center justify-between">
      <div className="flex-shrink-0 p-4 font-bold">
        <Link href="/" legacyBehavior passHref>
          Teleoscope
        </Link>
      </div>
      <NavigationMenu>
        <NavigationMenuList className={menuStyle}>
          {menuItems.map((item) => (
            <NavigationMenuItem key={item.label}>
            <Link href={item.href} passHref>
              <NavigationMenuLink className={cn(menuItemStyle, item.variant === "primary" && meneItemPrimaryStyle)}>
                {item.label}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}