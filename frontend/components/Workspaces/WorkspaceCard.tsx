import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspaceSettings } from "../Workspaces/WorkspaceModal";
import { WorkspaceCollaboratorsModal } from "../Workspaces/WorkspaceCollaboratorsModal";
import { EnterIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";

export const WorkspaceCard = ({ workspace }) => {
  return (
    <Card className="w-full h-40 flex-shrink-0 flex flex-col overflow-hidden border  rounded-lg">
      <CardHeader className=" bg-neutral-50 flex flex-row justify-between  w-full items-center border-b p-2 py-1 m-0 space-y-0">
        <CardTitle className="text-md p-0 font-medium w-fit flex items-center gap-1 ">
          {workspace.label}
          <WorkspaceSettings id={workspace._id} name={workspace.label} />
        </CardTitle>

        <Button variant="ghost" className="flex items-center ">
          <Link
            href={`/workspace/${workspace._id}`}
            className=" font-bold flex items-center p-0"
          >
            <EnterIcon />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-3 flex flex-col flex-1 ">
        <CardDescription className="text-sm">
          {workspace.description || "No description"}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col  justify-center items-center px-2 py-1 z-30">
        <WorkspaceCollaboratorsModal
          id={workspace._id}
          name={workspace.label}
          contributors={workspace.contributors || []}
        />
      </CardFooter>
    </Card>
  );
};
