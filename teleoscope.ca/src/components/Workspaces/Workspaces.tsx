"use client";;
import { useSWRF } from "@/lib/swr";
import { NewWorkspaceModal } from "../Workspaces/NewWorkspaceModal";
import WorkspaceGroup from "../Workspaces/WorkspaceGroup";
import { Teams } from "@/types/teams";
import { Stack } from "@mui/material";


export default function Workspaces() {
  const { data: teams } = useSWRF(`/api/teams`); // gets the current session's user

  return (
    <div className="steps step-four flex flex-col h-full w-full pt-4 2xl:p-6 rounded-lg">
      <div className="flex flex-row gap-2 items-center w-full justify-between pl-2 pb-4">
      
        <Stack direction="column" justifyContent="space-between">

          <h2 className="text-xl font-bold text-primary">Workspaces</h2>
          
        </Stack>
        <NewWorkspaceModal teams={teams} />
      </div>
      <div className="flex flex-col gap-4 w-full">
        {teams?.map((team: Teams) => (
          <WorkspaceGroup key={team._id?.toString()} team={team}></WorkspaceGroup>
        ))}
      </div>
    </div>
  );
}

