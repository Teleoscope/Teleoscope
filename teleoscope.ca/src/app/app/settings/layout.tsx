import {
  BoxIcon,
  Grid2X2Icon,
  UserIcon,
  Users2Icon,
  Wallet2Icon,
} from "lucide-react";
import UserContextProvider from "@/context/UserContext";
import { SidebarOption, Sidebar} from "@/components/Dashboard/Sidebar";
import {
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const navigationOptions = [
  {
    label: "Account",
    href: "/app/settings/account",
    icon: <UserIcon size={16} />,
  },
  {
    label: "Teams",
    href: "/app/settings/account/teams",
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
    label: "workspaces",
    href: "/app/settings/team/workspaces",
    icon: <Users2Icon size={16} />,
  },
  {
    label: "Billing and Storage",
    href: "/app/settings/team/billing",
    icon: <Wallet2Icon size={16} />,
  },
];

const sidebarOptions: Record<string, SidebarOption[]>
 = {
  account: navigationOptions,
  workspace: workspaceSettings,
};


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center w-screen h-screen ">
      <UserContextProvider userId="1">
      <Sidebar sidebarOptions={sidebarOptions}>
      <div className="flex gap-4 text-black items-center px-2 py-8 ">
          <Link href="/app">
            <ArrowLeft size={20} className="text-black" />
          </Link>
          <span className="text-2xl font-bold ">Settings </span>
        </div>
        </Sidebar>
      <div className="flex-1 w-full">{children}</div>
      </UserContextProvider>
    </div>
  );
}

