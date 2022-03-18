import React, { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { Client, Message } from "@stomp/stompjs";
import { useDrop } from "react-dnd";

import Button from "@mui/material/Button";

// custom components
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import PostList from "../components/PostList";
import WorkspaceItem from "../components/WorkspaceItem";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function useDocSets(q) {
  const { data, error } = useSWR(`/api/docsets/`, fetcher);
  var ret = {
    databaseDocSets: data,
    loading: !error && !data,
    error: error,
  };
  return ret;
}

export default function Workspace(props) {
  const [stagedSets, setStagedSets] = useState([]);
  const { databaseDocSets, loading, error } = useDocSets();
  // const [workspace, setWorkspace] = useState([]);
  const added = useSelector((state) => state.adder.value);
  const dispatch = useDispatch();
  var workSpaceItems = [];

  // TODO: look at websocket example code here and replicate
  // anywhere that needs to route a request to the server
  // possibly best to move this into an action? I'm unsure
  const client = new Client({
    brokerURL: "ws://localhost:3311/ws",
    connectHeaders: {
      login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME,
      passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD,
      host: "systopia",
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
    console.log("Connected to RabbitMQ webSTOMP server.");
  };

  client.activate();

  const docsetlist = () => {
    var arr = databaseDocSets;
    arr = arr.concat(stagedSets);
    if (arr.length < 1) {
      return null;
    }
    return arr.map((d) => <DocSet docset={d} key={d._id} />);
  };

  const register_task = () => {
    var headers = {};
    var body = {
      teleoscope_id: "622bbaedb5a28808bd4c993f",
      positive_docs: ["j1f7am", "j1f2rk"],
      negative_docs: ["j1f71q", "j1f36t"],
    };
    client.publish({
      destination: "/queue/systopia",
      headers: headers,
      body: JSON.stringify(body),
    });
  };

  const handleClick = () => {
    var temp = [...stagedSets];
    temp.push({ _id: null, label: "", queries: [] });
    setStagedSets(temp);
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "item",
    drop: (item) => dispatch(adder(item.id)),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  useEffect(() => {
    workSpaceItems = added;
  }, [added]);

  return (
    <div key="containerkey" id="containerkey">
      <LeftMenuBar />
      <RightMenuBar />
      <Button variant="text" onClick={() => register_task()}>
        Register Task
      </Button>
      <div ref={drop} id="workspace" key="workspacekey">
        {added.map((id) => {
          return <WorkspaceItem id={id} />;
        })}
      </div>
    </div>
  );
}
