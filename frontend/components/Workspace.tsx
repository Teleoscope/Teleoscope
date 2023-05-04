import React, { useContext } from "react";

// custom components
import DrawerMini from "@/components/DrawerMini";

import { useAppSelector } from '@/util/hooks'
import { Stomp, StompContext } from './Stomp'
import { swr, swrContext } from "@/util/swr";

export default function Workspace(props) {
  
  const userid = useAppSelector((state) => state.activeSessionID.userid);

  const options = {
    database: props.subdomain.split(".")[0],
    userid: userid
  }
  const client = Stomp.getInstance(options);
  const mySWR = new swr(props.subdomain.split(".")[0]);
  
  return (
    <swrContext.Provider value={mySWR}>
    <StompContext.Provider value={client}>
    <DrawerMini />
    </StompContext.Provider>
    </swrContext.Provider>

  );
}
