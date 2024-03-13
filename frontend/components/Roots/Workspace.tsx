// custom components
import DrawerMini from "@/components/Sidebar/DrawerMini";
import { SWR, swrContext } from "@/util/swr";
import HelpMenu from "@/components/HelpMenu";
import { useSession } from "next-auth/react";
import { useStomp } from "@/util/Stomp";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { setReplyToQueue } from "@/actions/activeSessionID";
import crypto from 'crypto';

export default function Workspace({ database, workflow, workspace }) {
  const { data: session, status } = useSession();
  const userid = useAppSelector((state: RootState) => state.activeSessionID.userid);
  const client = useStomp()
  
  const queuehash = crypto.randomBytes(8).toString('hex');
  const replyToQueue = `${userid}%${queuehash}`
  const dispatch = useAppDispatch();
  dispatch(setReplyToQueue(replyToQueue))

  if (client) {
    client.userId = userid;
    client.database = database;
    client.workflow = workflow;
    client.workspace = workspace;
    client.replyToQueue = replyToQueue;
  }

  const mySWR = new SWR(database);

  return (
    <swrContext.Provider value={mySWR}>
        <HelpMenu />
        <DrawerMini />
    </swrContext.Provider>
  );
}
