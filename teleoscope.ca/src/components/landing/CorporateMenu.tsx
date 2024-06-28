import Link from "next/link";
import Image from "next/image";
import GetStartedBtn from "../GetStartedBtn";

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
];

export default function Menu() {
  const menuStyle = "flex items-center justify-between px-2 gap-4 ";
  const menuItemStyle =
    "flex-shrink-0 p-2 font-medium text-neutral-900 rounded hover:bg-neutral-100 hidden md:flex";
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
              <Link href={item.href} className={menuItemStyle}>
                {item.label}
              </Link>
            </div>
          ))}
          <GetStartedBtn />
        </div>
      </section>
    </div>
  );
}
