import React from "react";
import DocSet from "../components/DocSet";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { SelectableGroup } from "react-selectable-fast";
import MenuBar from "../components/MenuBar";
import { Client, Message } from "@stomp/stompjs";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import { useDrop } from "react-dnd";
import PostList from "../components/PostList";
import WorkspaceItem from "./WorkspaceItem";
import StoryCard from "./StoryCard";

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
  const workSpaceItems = [];

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
      boop: "beep",
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
    drop: (item) => addItemToWorkSpace(item.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const addItemToWorkSpace = (id) => {
    console.log("dropped:", id);
    workSpaceItems.push(id);
    console.log("dropped items", workSpaceItems);
    // const randomList = RandomList.filter((item) => id === item.id);
    // setWorkspace((workspace) => [...workspace, randomList[0]]);
  };

  return (
    <div key="containerkey" id="containerkey">
      <LeftMenuBar addItemToWorkSpace={addItemToWorkSpace} />
      <RightMenuBar />
      <div ref={drop} id="workspace" key="workspacekey">
        <WorkspaceItem />
        <PostList data={workSpaceItems} isFavList={false} isHideList={true} />
        {/* {databaseDocSets ? docsetlist() : null} */}
      </div>
    </div>
  );
}
