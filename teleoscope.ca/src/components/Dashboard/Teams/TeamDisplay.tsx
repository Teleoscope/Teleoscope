'use client';
import { useSWRF } from '@/lib/swr';
import { Teams } from '@/types/teams';
import TeamCard from '@/components/Dashboard/Teams/TeamCard';
import { Accounts } from '@/types/accounts';
import NewTeamModalWrapper from './NewTeamModal';

export default function TeamDisplay({ account }: { account: Accounts }) {
    const { data: teams } = useSWRF(`/api/teams`); // gets the current session's user
    const newTeamSlots = account.resources.amount_teams_available ;

    return (
        <div className="flex flex-col  items-center pl-2 p-2 overflow-y-scroll">
            <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teams &&
                    teams.map((team: Teams) => (
                        <TeamCard team={team} key={team._id!.toString()} />
                    ))}
                     {Array.from({ length: newTeamSlots }).map((_, i) => (
                <NewTeamModalWrapper key={i}/>
            ))}
            </div>
           
        </div>
    );
}
