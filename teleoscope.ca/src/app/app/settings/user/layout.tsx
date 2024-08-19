import { BellIcon, UserIcon, WalletCards } from 'lucide-react';
import UserContextProvider from '@/context/UserContext';
import { SidebarOption, Sidebar } from '@/components/Dashboard/Sidebar/Sidebar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const navigationOptions = [
    {
        label: 'Account',
        href: '/app/settings/user',
        icon: <UserIcon size={16} />
    },
    {
        label: 'Notifications',
        href: '/app/settings/user/notifications',
        icon: <BellIcon size={16} />
    },
    {
        label: 'Subscriptions',
        href: '/app/settings/user/subscriptions',
        icon: <WalletCards size={16} />
    }
];

const sidebarOptions: Record<string, SidebarOption[]> = {
    options: navigationOptions
};

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-center w-screen h-screen overflow-hidden max-h-screen">
            <UserContextProvider userId="1">
                <Sidebar sidebarOptions={sidebarOptions} haveSections={false}>
                    <div className="flex gap-4 text-black items-center px-2 py-8 ">
                        <Link href="/app">
                            <ArrowLeft size={20} className="text-black" />
                        </Link>
                        <span className="text-2xl font-bold ">Settings </span>
                    </div>
                </Sidebar>
                <div className="flex-1 w-full overflow-y-scroll">{children}</div>
            </UserContextProvider>
        </div>
    );
}
