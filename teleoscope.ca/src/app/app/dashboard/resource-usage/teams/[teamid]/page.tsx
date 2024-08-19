'use client';
import { WorkspaceCard } from '@/components/Workspaces/WorkspaceCard';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/context/UserContext';
import { useSWRF } from '@/lib/swr';
import { useParams } from 'next/navigation';

export default function TeamPage() {
    const params = useParams<{ teamid: string }>();
    const { user } = useUserContext();
    const { data: team } = useSWRF(`/api/team?team=${params.teamid}`);

    if (!team) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full w-full p-2  overflow-hidden items-center">
            <section className="flex flex-col h-full w-full  max-w-[2000px] overflow-hidden items-center">
                <div className="flex flex-col h-full w-full pt-4  border-neutral-100 2xl:border 2xl:p-6 rounded-lg">
                    <div className="flex flex-row gap-2 items-center pl-2 pb-10">
                        <h2 className="text-xl font-bold  text-primary">
                            {team.label}
                        </h2>
                        <span className="text-sm font-medium border px-2 rounded-xl text-neutral-500">
                            {user._id === team.owner ? 'Owner' : 'Member'}
                        </span>
                        {user._id === team.owner && (
                            <span className="text-sm font-medium border px-2 rounded-xl text-neutral-500">
                                {`acccount id: ${team.account}`}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-row gap-4 items-center pl-2 pb-4">
                        <h2 className="text-md font-bold  text-primary">
                            Users
                        </h2>
                        <Button
                            className={` items-center h-fit py-0.5 text-sm w-fit gap-2 text-left justify-start `}
                            variant={'outline'}
                        >
                            Buy more seats
                        </Button>
                    </div>
                    <div className="flex  gap-4 w-full pb-10 ">
                        {team.users.map((user: string) => (
                            <UserCard key={user} user={user} />
                        ))}
                        <NewUserCard />
                        <NewUserCard />
                        <NewUserCard />
                        <NewUserCard />
                        <NewUserCard />
                    </div>
                    <div className="flex flex-row gap-2 pt-4 items-center pl-2 pb-4">
                        <h2 className="text-md font-bold  text-primary">
                            Workspaces
                        </h2>
                    </div>
                    <div className="flex  gap-4 w-full">
                        {team.workspaces.map((workspace: string) => (
                            <WorkspaceCard
                                key={workspace}
                                workspaceId={workspace}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

function UserCard({ user, key }: { user: string; key: string }) {
    return (
        <div
            key={key}
            className="flex-shrink-0 bg-gray-50 w-full h-10 flex flex-col  justify-between odd:bg-white"
        >
            <Button
                className={`w-full  items-center flex-1 text-md font-medium gap-2 text-left justify-start border-none`}
                variant={'ghost'}
            >
                <span className="flex-1 flex items-center gap-2">{user}</span>
                <div className="flex flex-row gap-4 text-sm items-center">
                    Read Only
                </div>
            </Button>
        </div>
    );
}

function NewUserCard() {
    return (
        <div className="flex-shrink-0 bg-gray-50  h-32 rounded-lg w-32 flex flex-col border-dashed  justify-center items-center border">
            <Button
                className={`w-full  items-center flex-1 text-md font-medium gap-2 text-left justify-center border-none`}
                variant={'ghost'}
            >
                <span className="flex-1 flex  text-center items-center justify-center gap-2">
                    New <br /> Collaborator
                </span>
            </Button>
        </div>
    );
}
