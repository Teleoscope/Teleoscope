import React from "react";
import DocSet from "../components/DocSet";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { SelectableGroup } from "react-selectable-fast";
import MenuBar from "../components/MenuBar";
import { Client, Message } from '@stomp/stompjs';
import LeftMenuBar from '../components/LeftMenuBar';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function useDocSets(q) {
  const { data, error } = useSWR(
    `/api/docsets/`,
    fetcher
  );
  var ret = {
    databaseDocSets: data,
    loading: !error && !data,
    error: error,
  };
  return ret
}

export default function Workspace(props) {

  const [stagedSets, setStagedSets] = useState([])
  const {databaseDocSets, loading, error} = useDocSets()

  // TODO: look at websocket example code here and replicate
  // anywhere that needs to route a request to the server
  // possibly best to move this into an action? I'm unsure
  const client = new Client({
    brokerURL: 'ws://localhost:3311/ws',
    connectHeaders: {
      login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME,
      passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD,
      host: 'systopia',
    },
    debug: function (str) {
      console.log(str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  client.onConnect = function (frame) {
    // Do something, all subscribes must be done is this callback
    // This is needed because this will be executed after a (re)connect
    console.log("Connected to RabbitMQ webSTOMP server.")
  };

  client.activate();

  const docsetlist = () => {
    var arr = databaseDocSets
    arr = arr.concat(stagedSets)
    if (arr.length < 1) {
      return null
    }
    return arr.map((d) => (
      <DocSet 
        docset={d}
        key={d._id}
      />
    ))
  }

  const register_task = () => { 
    var headers = {
    }
    var body = {
      boop: "beep"
    }
    client.publish({
      destination: "/queue/systopia", 
      headers: headers, 
      body: JSON.stringify(body)})
  }

  const handleClick = () => {
    
    var temp = [...stagedSets]
    temp.push({_id:null, label:"","queries":[]})
    setStagedSets(temp)
  }

  return (
    <div key="containerkey">
      <div id="workspace" key="workspacekey">
        <LeftMenuBar />
        {databaseDocSets ? docsetlist() : null}
      </div>
    </div>
  );

  // return (
  //   <div key="containerkey">
  //     <MenuBar 
  //       callback={register_task} 
  //       connected={props.isConnected} 
  //     />
  //     <div id="workspace" key="workspacekey">
  //       {databaseDocSets ? docsetlist() : null}
  //     </div>
  //   </div>
  // );
}
