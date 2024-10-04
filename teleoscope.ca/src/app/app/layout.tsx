"use client";
import UserContextProvider from '@/context/UserContext';


export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-center w-screen h-screen ">
                <UserContextProvider userId="1">
                    <div className="flex-1 w-full flex-col">{children}</div>
                </UserContextProvider>
        </div>
    );
}
