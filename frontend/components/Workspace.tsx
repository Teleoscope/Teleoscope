// custom components
import DrawerMini from "@/components/DrawerMini";
import { SWR, swrContext } from "@/util/swr";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { sessionActivator } from "@/actions/activeSessionID";
import HelpMenu from "@/components/HelpMenu";
import { useSession } from "next-auth/react";
import { useStomp } from "../util/Stomp";

export default function Workspace({subdomain}) {
  const { data: session, status } = useSession();
  const userid = session?.user?.id;
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const client = useStomp()
  client.userId = session?.user.id;

  const dispatch = useAppDispatch();
  const mySWR = new SWR(subdomain?.split(".")[0]);

  const { user } = mySWR.useSWRAbstract("user", `users/${userid}`);
  
  if (user && !session_id) {
    dispatch(sessionActivator(user.sessions[0]));
  }


  return (
    <swrContext.Provider value={mySWR}>
        <HelpMenu />
        <DrawerMini />
    </swrContext.Provider>
  );
}
