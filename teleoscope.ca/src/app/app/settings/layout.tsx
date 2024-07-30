import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BoxIcon,
  Grid2X2Icon,
  UserIcon,
  Users2Icon,
  Wallet2Icon,
} from "lucide-react";
import UserContextProvider from "@/context/UserContext";

const navigationOptions = [
  {
    label: "Account",
    href: "/app/settings/account",
    icon: <UserIcon size={16} />,
  },
  {
    label: "Workspaces",
    href: "/app/settings/account/workspaces",
    icon: <Grid2X2Icon size={16} />,
  },
];

const workspaceSettings = [
  {
    label: "General",
    href: "/app/settings/workspace/general",
    icon: <BoxIcon size={16} />,
  },
  {
    label: "teams",
    href: "/app/settings/workspace/teams",
    icon: <Users2Icon size={16} />,
  },
  {
    label: "Billing and Storage",
    href: "/app/settings/workspace/billing",
    icon: <Wallet2Icon size={16} />,
  },
];

const sidebarOptions = {
  account: navigationOptions,
  workspace: workspaceSettings,
};

function capitalizeFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center w-screen h-screen ">
      <UserContextProvider userId="1">
      <Sidebar />
      <div className="flex-1 w-full">{children}</div>
      </UserContextProvider>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex flex-col h-screen bg-zinc-50 border-r  w-60 overflow-hidden">
      <div className="flex gap-4 text-black items-center px-2 py-4 ">
        <Link href="/app">
          <ArrowLeft size={20} className="text-black" />
        </Link>
        <span className="text-2xl font-bold ">Settings </span>
      </div>
      {Object.entries(sidebarOptions).map(([key, options]) => (
        <div className="flex flex-col pt-2  pb-5 border-b" key={key}>
          <span className="text-md font-semibold p-4 py-2 ">
            {capitalizeFirstLetter(key)}
          </span>
          <div className="flex flex-col flex-1 px-2 ">
            {options.map((option) => (
              <Link key={option.label} href={option.href}>
                <span className="flex items-center gap-4 p-2 rounded-lg text-md hover:bg-gray-200 cursor-pointer">
                  {option.icon}
                  <span>{option.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-1 items-end justify-center  ">
        <Link href="/" className="w-full border-t p-2 flex justify-center">
        <Image
          src={"/assets/TeleoscopeLogo.svg"}
          alt="Logo"
          width={80}
          height={20}
        />
        </Link>
      </div>
    </div>
  );
}
