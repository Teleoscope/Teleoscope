import {
    BoxIcon,
    Grid2X2Icon,
    UserIcon,
    Users2Icon,
    Wallet2Icon,
  } from "lucide-react";
  import UserContextProvider from "@/context/UserContext";
  import { SidebarOption, Sidebar} from "@/components/Dashboard/Sidebar";
  
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
  
  const teamSettings = [
    {
      label: "Workspaces",
      href: "/app/workspaces",
      icon: <BoxIcon size={16} />,
    },
  ];
  
  const sidebarOptions: Record<string, SidebarOption[]>
   = {
    account: navigationOptions,
    team: teamSettings,
  };
  
  
  export default async function DashboardLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="flex justify-center w-screen h-screen ">
        <UserContextProvider userId="1">
        <Sidebar sidebarOptions={sidebarOptions} />
        <div className="flex-1 w-full">{children}</div>
        </UserContextProvider>
      </div>
    );
  }
  
  