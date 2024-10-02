import UserContextProvider from '@/context/UserContext';
import * as Frigade from '@frigade/react';

export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-center w-screen h-screen ">
            <Frigade.Provider
                apiKey={process.env.FRIGADE_API_PUBLIC || ''}
                userId="my-user-id"
            >
                <UserContextProvider userId="1">
                    <Frigade.Announcement
                        flowId="flow_En5edv1a"
                        dismissible={true}
                    />
                    <div className="flex-1 w-full flex-col">{children}</div>
                </UserContextProvider>
            </Frigade.Provider>
        </div>
    );
}
