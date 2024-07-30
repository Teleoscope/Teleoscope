import {
    BoxIcon,
    UserIcon,
  } from "lucide-react";
  import UserContextProvider from "@/context/UserContext";
  import { SidebarOption, Sidebar} from "@/components/Dashboard/Sidebar";
  
  const navigationOptions = [
    {
      label: "Settings",
      href: "/app/settings/account",
      icon: <UserIcon size={16} />,
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
    team: teamSettings,
    account: navigationOptions,
    
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
            <div className="py-8  w-full flex">
             <span className="text-2xl px-4 w-full font-semibold">Teleoscope</span>
            </div>
        </Sidebar>
        <div className="flex-1 w-full">{children}</div>
        </UserContextProvider>
      </div>
    );
  }
  
  