import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { NewWorkspaceModal } from "../Workspaces/NewWorkspaceModal";
import { Button } from "../ui/button";
import { WorkspaceCard } from "../Workspaces/WorkspaceCard";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const Workspaces = ({ workspaces }) => {
  return (
    <div className="flex flex-col h-full w-full p-2 py-4  border-neutral-100 2xl:border 2xl:p-6 rounded-lg">
      <div className="flex flex-row gap-2 justify-between items-center pb-4">
        <h2 className="text-xl font-medium ">Workspaces</h2>
        <NewWorkspaceModal />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-[auto-fill,minmax(0,300px)] gap-4 w-full grid-flow-row ">
        {workspaces?.map((ws) => (
          <WorkspaceCard workspace={ws}></WorkspaceCard>
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
    <div className="flex flex-col h-full w-full p-4 max-w-[1800px] overflow-hidden items-center">
    <section className="flex flex-col h-full w-full p-4 max-w-[1800px] overflow-hidden items-center">
      <div className="flex flex-row justify-between pt-2 pb-6 items-center w-full">
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
    </div>
  );
}
