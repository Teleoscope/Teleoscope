'use client';;
import TeamDisplay from '@/components/Dashboard/Teams/TeamDisplay';
import { useSWRF } from '@/lib/swr';
import { Accounts } from '@/types/accounts';
import MoreStorageModal from "@/components/Dashboard/Account/MoreStorageModal";

export default function ResourceUsagePage() {
    const { data: accounts } = useSWRF(`/api/accounts`);
    const { data: account } = useSWRF(`/api/account`) as { data: Accounts };
    const availableTeams = account?.resources.amount_teams_available;
    const usedTeams = account?.resources.amount_teams_used;

    if (!accounts || !account) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full w-full p-2  overflow-hidden items-center">
            <section className="flex flex-col h-full w-full  max-w-[2000px] overflow-y-scroll items-center">
                <div className="flex flex-col w-full h-full  pt-4   2xl:p-6 rounded-lg">
                    <div className="flex flex-row gap-2 items-center pl-2 pb-4">
                        <h2 className="text-xl font-bold  text-primary">
                            Teams and Resources
                        </h2>
                    </div>

                    <div className="flex flex-col w-full pt-4  border-neutral-100  2xl:p-6 ">
                        <StorageBar storage={account.resources} />
                    </div>
                    <div className="flex flex-col w-full pt-4  border-neutral-100 r 2xl:p-6 r">
                        <div className="flex flex-row gap-2 items-center pl-2 pb-4">
                            <h2 className="text-xl font-bold  text-primary">
                                Teams
                            </h2>
                            <span className="text-sm font-medium">
                                {usedTeams}/{availableTeams + usedTeams}
                                {availableTeams <= 0 && (
                                    <span className="px-2">
                                        (Upgrade to create more)
                                    </span>
                                )}
                            </span>
                        </div>
                        <TeamDisplay account={account} />
                    </div>
                </div>
            </section>
        </div>
    );
}

function StorageBar({ storage }: { storage: any }) {
    const { amount_storage_available, amount_storage_used } = storage;
    const percentage =
        (amount_storage_used / amount_storage_available) * 100;

    return (
        <div className="flex flex-col gap-4 pl-2 pb-4">
            <div className="flex flex-row gap-2 justify-between p-2 items-center">
                <h2 className="text-xl font-bold  text-primary">Storage</h2>
               <MoreStorageModal />
            </div>
            <div className="flex flex-row gap-4 items-center p-2">
                <div className="flex  flex-row gap-2 h-10 border rounded-lg overflow-hidden bg-gray-100 items-center w-full relative">
                    <div
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <span className="text-sm font-medium">
                    {amount_storage_used}GB/{amount_storage_available}GB
                </span>
            </div>
        </div>
    );
}
