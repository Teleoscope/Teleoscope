import React from "react";

// custom components
import DrawerMini from "@/components/DrawerMini";

import { Stomp, StompContext } from "@/components/Stomp";

import { swr, swrContext } from "@/util/swr";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { useCookies } from "react-cookie";
import { sessionActivator, setUserId } from "@/actions/activeSessionID";

export default function Workspace(props) {
  const [cookies, setCookie] = useCookies(["userid"]);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  
  const dispatch = useAppDispatch();
  
  if (cookies.userid != userid) {
    dispatch(setUserId(cookies.userid));
  }

  const options = {
    database: props.subdomain.split(".")[0],
    userid: userid,
  };

  const client = Stomp.getInstance(options);
  
  const mySWR = new swr(props.subdomain.split(".")[0]);

  const { user } = mySWR.useSWRAbstract("user", `users/${userid}`);

  if (user && session_id == "000000000000000000000000") {
    dispatch(sessionActivator(user.sessions[0]));
  }


  return (
    <swrContext.Provider value={mySWR}>
      <StompContext.Provider value={client}>
        <DrawerMini />
      </StompContext.Provider>
    </swrContext.Provider>
  );
}
