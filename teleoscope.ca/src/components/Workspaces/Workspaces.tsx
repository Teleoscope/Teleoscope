"use client";;
import { useSWRF } from "@/lib/swr";
import { NewWorkspaceModal } from "../Workspaces/NewWorkspaceModal";
import WorkspaceGroup from "../Workspaces/WorkspaceGroup";
import { Teams } from "@/types/teams";


export default function Workspaces() {
  const { data: teams } = useSWRF(`/api/teams`); // gets the current session's user

  return (
    <div className="flex flex-col h-full w-full p-2 py-4  border-neutral-100 2xl:border 2xl:p-6 rounded-lg">
      <div className="flex flex-row gap-2 justify-between items-center pb-4">
        <h2 className="text-xl font-medium ">Workspaces</h2>
        <NewWorkspaceModal teams={teams} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-[auto-fill,minmax(0,300px)] gap-4 w-full grid-flow-row ">
        {teams?.map((team: Teams) => (
          <WorkspaceGroup key={team._id?.toString()} team={team}></WorkspaceGroup>
        ))}
      </div>
    </div>
  );
}

