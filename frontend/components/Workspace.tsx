import React from "react";

// custom components
import DrawerMini from "@/components/DrawerMini";

import { Stomp, StompContext } from "@/components/Stomp";

import { swr, swrContext } from "@/util/swr";
import { useAppSelector } from "@/util/hooks";

export default function Workspace(props) {
  const userid = useAppSelector((state) => state.activeSessionID.userid);

  const options = {
    database: props.subdomain.split(".")[0],
    userid: userid,
  };
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
