// custom components
import DrawerMini from "@/components/Sidebar/DrawerMini";
import { SWR, swrContext } from "@/util/swr";
import HelpMenu from "@/components/HelpMenu";
import { useSession } from "next-auth/react";
import { useStomp } from "@/util/Stomp";

export default function Workspace({ database, workflow, workspace }) {
  const { data: session, status } = useSession();

  const client = useStomp()
  client.userId = session?.user.id;
  client.database = database;
  client.workflow = workflow;
  client.workspace = workspace;
  const mySWR = new SWR(database);

  return (
    <swrContext.Provider value={mySWR}>
        <HelpMenu />
        <DrawerMini />
    </swrContext.Provider>
  );
}
