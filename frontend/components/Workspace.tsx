import { useEffect, useState } from "react";

// custom components
import DrawerMini from "@/components/DrawerMini";

import { Stomp, StompContext } from "@/components/Stomp";

import { SWR, swrContext } from "@/util/swr";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { useCookies } from "react-cookie";
import { sessionActivator, setUserId } from "@/actions/activeSessionID";
import HelpMenu from "@/components/HelpMenu";

export default function Workspace({subdomain}) {
  const [cookies, setCookie] = useCookies(["userid"]);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const [client, setClient] = useState<Stomp | null>(null);
  
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (cookies.userid) {
      dispatch(setUserId(cookies.userid))
    }
    setClient(Stomp.getInstance({
      userid: cookies.userid, 
      subdomain: subdomain?.split(".")[0]
    }));
  }, [userid])

  
  const mySWR = new SWR(subdomain?.split(".")[0]);

  const { user } = mySWR.useSWRAbstract("user", `users/${userid}`);
  
  if (user && !session_id) {
    dispatch(sessionActivator(user.sessions[0]));
  }


  return (
    <swrContext.Provider value={mySWR}>
      <StompContext.Provider value={client}>
        <HelpMenu />
        <DrawerMini />
      </StompContext.Provider>
    </swrContext.Provider>
  );
}
