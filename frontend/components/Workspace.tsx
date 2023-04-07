import React, { useContext } from "react";

// custom components
import TopBar from "./WindowModules/TopBar";
import Flow from "./Flow";
import { useAppSelector, useAppDispatch } from '@/util/hooks'
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
    <div style={{ cursor: "context-menu" }}>
      <div style={{ width: "100vw", height: "10vh" }}>
        <TopBar isConnected={props.isConnected} />
      </div>
      <Flow></Flow>
    </div>
    </StompContext.Provider>
    </swrContext.Provider>

  );
}
