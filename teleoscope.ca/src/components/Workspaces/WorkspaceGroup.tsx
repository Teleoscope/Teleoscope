import { Teams } from "@/types/teams";
import { WorkspaceCard } from "./WorkspaceCard";

export default function WorkspaceGroup({ team } : {team: Teams}) {
    return <section className="flex flex-col w-full border-b p-4 gap-4  bg-opacity-15">
        <h2 className="text-lg font-medium ">{team.label}</h2>
        <div className="flex flex-row gap-4  items-center pb-4 min-h-[200px] overflow-x-scroll">
        {team.workspaces.map((ws,i,a) => <WorkspaceCard key={`${i}-${ws.id}-workspace`} workspaceId={ws} />)}
        </div>
    </section>
}