import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
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
import { NewWorkspaceModal } from "../Workspaces/NewWorkspaceModal";
import { EnterIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const ExistingWorkspace = ({ workspace }) => {
  // Use window.location to determine the host dynamically
  // const protocol = window.location.protocol;
  // const host = window.location.host; // Includes hostname and port if applicable

  // const { data: coll } = useSWR(`/api/users/${contributor}`, fetcher)
  return (
    <Card className="w-full h-44 flex-shrink-0  flex flex-col cursor-pointer hover:border-primary-600">
      <CardHeader className=" flex flex-row justify-between  w-full items-center border-b p-2 py-1 m-0 space-y-0">
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
          {workspace.description || "No description provided"}
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

const Workspaces = ({ workspaces }) => {
  return (
    <div className="flex flex-col h-full w-full p-2 py-4 border-y">
      <div className="flex flex-row gap-2 justify-between items-center pb-4">
        <h2 className="text-xl font-medium ">Workspaces</h2>
        <NewWorkspaceModal />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full grid-flow-row auto-cols-[minmax(0,300px)]">
        {workspaces?.map((ws) => (
          <ExistingWorkspace workspace={ws}></ExistingWorkspace>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { data: user, error } = useSWR(
    `/api/user/${session?.user?.id}`,
    fetcher
  );
  const { data: workspaces } = useSWR(`/api/workspaces`, fetcher);

  if (error || status != "authenticated" || !session) {
    return (
      <div>
        Looks like you forgot to sign in.{" "}
        <Link href="/">Click here to return to the home page.</Link>
      </div>
    );
  }

  return (
    <section className="flex flex-col h-full w-full p-4 overflow-hidden">
      <div className="flex flex-row justify-between pt-2 pb-6 items-center">
        <div className="flex flex-col ">
          <Link href={"/"} className="text-primary-600 font-semibold text-sm">
            Teleoscope
          </Link>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <span className="text-sm text-neutral-700 font-medium italic  px-1">
            {user?.username || "User"}
          </span>
        </div>

        <Button
          size={"sm"}
          className="bg-neutral-900 text-white"
          onClick={() => signOut({ callbackUrl: `/` })}
        >
          Sign out
        </Button>
      </div>
      <Workspaces workspaces={workspaces} />
    </section>
  );
}
