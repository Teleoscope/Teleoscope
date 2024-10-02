import { BoxIcon, PieChartIcon, CogIcon } from 'lucide-react';
import UserContextProvider from '@/context/UserContext';
import { SidebarOption, Sidebar } from '@/components/Dashboard/Sidebar/Sidebar';
import { UserAccountPopover } from '@/components/Dashboard/UserAccountPopover';
import Image from 'next/image';

const teamSettings = [
    {
        label: 'Workspaces',
        href: '/app/dashboard/workspaces',
        icon: <BoxIcon size={16} />
    },
    {
        label: 'Resource Usage',
        href: '/app/dashboard/resource-usage',
        icon: <PieChartIcon size={16} />
    },
    {
        label: 'Settings',
        href: '/app/settings/user',
        icon: <CogIcon size={16} />
    }
];

const sidebarOptions: Record<string, SidebarOption[]> = {
    team: teamSettings
};

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-center w-screen h-screen ">
            <UserContextProvider userId="1">
                <Sidebar sidebarOptions={sidebarOptions} haveSections={false}>
                    <div className="flex flex-col items-center justify-center py-5 gap-2 px-1 ">
                        <div className="  w-full flex items-center gap-2  px-2">
                            <Image
                                src={'/assets/TeleoscopeStars.svg'}
                                alt="Logo"
                                width={18}
                                height={18}
                            />
                            <span className="text-xl  w-full font-semibold">
                                Teleoscope
                            </span>
                        </div>
                        <div className="w-full px-1  rounded-xl   py-1">
                            <input
                                type="text"
                                placeholder="Search"
                                className="px-2 h-9 w-full border bg-transparent rounded-lg text-sm from-zinc-50 to-white bg-gradient-to-t "
                            />
                        </div>
                    </div>
                </Sidebar>
                <div className="flex-1 w-full flex-col">
                    <UserAccountPopover />
                    {children}
                </div>
            </UserContextProvider>
        </div>
    );
}
