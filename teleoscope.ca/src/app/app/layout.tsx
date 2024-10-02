import UserContextProvider from '@/context/UserContext';
import ShepherdProvider from "@/context/Shepherd";

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-center w-screen h-screen ">
            <ShepherdProvider>
                <UserContextProvider userId="1">
                    <div className="flex-1 w-full flex-col">{children}</div>
                </UserContextProvider>
            </ShepherdProvider>
        </div>
    );
}
