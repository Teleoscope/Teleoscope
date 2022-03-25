import React from "react";
import { Client, Message } from "@stomp/stompjs";
import { useDrop } from "react-dnd";
import useSWR, { mutate } from "swr";

import Button from "@mui/material/Button";

// custom components
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WorkspaceItem from "../components/WorkspaceItem";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";

import randomstring from "randomstring";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useTeleoscopes() {
  const { data, error } = useSWR(`/api/teleoscopes/`, fetcher);
  return {
    teleoscopes: data,
    teleoscope_id: data ? data[data.length - 1]['teleoscope_id'] : -1,
    loading: !error && !data,
    error: error,
  };
}

export default function Workspace(props) {
  const { teleoscopes, teleoscope_id, loading, error } = useTeleoscopes();

  const added = useSelector((state) => state.adder.value);
  const search_term = useSelector((state) => state.searcher.value);
  const dispatch = useDispatch();

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


  const reorient = () => {
    var body = {
      task: "reorient",
      args: {
        query: search_term, // TODO
        teleoscope_id: teleoscope_id, // TODO
        positive_docs: added,
        negative_docs: [],
      }
    }
    publish(body);
  }

  const initialize_teleoscope = () => {
    var body = {
      task: 'initialize_teleoscope',
      args: {
        query: search_term
      }
    }
    publish(body);
  }

 const publish = (body) => {
    var headers = {};
    client.publish({
      destination: "/queue/systopia",
      headers: headers,
      body: JSON.stringify(body),
    });
 }


  const [{ isOver }, drop] = useDrop(() => ({
    accept: "item",
    drop: (item) => dispatch(adder(item.id)),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div key="containerkey" id="containerkey">
      <LeftMenuBar />
      <RightMenuBar teleoscope_id={teleoscope_id} />
      <Button variant="text" onClick={() => initialize_teleoscope()}>
        New Teleoscope {teleoscope_id}
      </Button>
      <Button variant="text" onClick={() => reorient()}>
        Reorient
      </Button>
      <div ref={drop} id="workspace" key="workspacekey">
        {added.map((id) => {
          return <WorkspaceItem id={id} />;
        })}
      </div>
    </div>
  );
}
