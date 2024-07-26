import { Teams } from "@/types/teams";
import { WorkspaceCard } from "./WorkspaceCard";

export default function WorkspaceGroup({ team } : {team: Teams}) {
    return <>
        {team.label}:
        {team.workspaces.map((ws,i,a) => <WorkspaceCard key={`${i}-${ws.id}-workspace`} workspaceId={ws} />)}
    </>
}