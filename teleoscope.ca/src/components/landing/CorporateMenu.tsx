import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
    label: "Get Started",
    href: "/signup",
    variant: "primary",
  },
];

export default function Menu() {
  const menuStyle = "flex items-center justify-between px-2 gap-4 ";
  const menuItemStyle =
    "flex-shrink-0 p-2 font-medium text-neutral-900 rounded hover:bg-neutral-100 ";
  const menuItemPrimaryStyle =
    "flex-shrink-0 bg-primary hover:bg-secondary rounded-full duration-500 text-white  p-2 px-4 font-medium ";

  return (
    <div className="flex items-center justify-between relative z-20">
      <div className="flex-shrink-0 p-4 font-bold">
      <Link href="/" className="font-bold text-2xl  relative ">
        <Image
            src={"/assets/TeleoscopeLogo.svg"}
            alt="Logo"
            width={90}
            height={8}
        />
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
