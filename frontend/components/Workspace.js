import React from "react";
import DocSet from "../components/DocSet";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { SelectableGroup } from "react-selectable-fast";
import MenuBar from "../components/MenuBar";
import AMQPClient from '../util/amqp-websocket-client';


const fetcher = (...args) => fetch(...args).then((res) => res.json());


/// amqp
var url = 'ws://localhost:3311/ws';
const amqp = new AMQPClient(url, "/", "phb2", "changeme");
      async function start() {
        try {
          const conn = await amqp.connect()
          const ch = await conn.channel()
          attachPublish(ch)
          const q = await ch.queue("")
          await q.bind("amq.fanout")
          const consumer = await q.subscribe({noAck: false}, (msg) => {
            console.log(msg)
            textarea.value += msg.bodyToString() + "\n"
            msg.ack()
          })
          console.log("Connection successful?")
        } catch (err) {
          console.error("Error", err, "reconnecting in 1s")
          disablePublish()
          setTimeout(start, 1000)
        }
      }

      function attachPublish(ch) {
        document.forms[0].onsubmit = async (e) => {
          e.preventDefault()
          try {
            await ch.basicPublish("amq.fanout", "", input.value, { contentType: "text/plain" })
          } catch (err) {
            console.error("Error", err, "reconnecting in 1s")
            disablePublish()
            setTimeout(start, 1000)
          }
          input.value = ""
        }
      }


      function disablePublish() {
        alert("Disconnected, waiting to be reconnected");
      }
      // start()

///


////
// const celery = require('celery-node');
// 
// const client = celery.createClient(
//   "amqp://phb2:changeme@localhost:5672/systopia",
//   "rpc://"
// );
// 
// const task = client.createTask("tasks.hello");
// const result = task.applyAsync();
// result.get().then(data => {
//   console.log(data);
//   client.disconnect();
// });

////

/*

///// start stomp
// Stomp.js
// import { Client, Message } from '@stomp/stompjs';


const client = new Client({
  brokerURL: 'ws://localhost:3311/ws',
  connectHeaders: {
    login: 'phb2',
    passcode: 'changeme',
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



///// end stomp
*/
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
  console.log("ret", ret)

  return ret
}

export default function Workspace(props) {
  
  const [stagedSets, setStagedSets] = useState([])
  const {databaseDocSets, loading, error} = useDocSets()

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

/*
// reply_to: 0fde7731-a9ed-3dc1-a587-1549cf57a130
// correlation_id: c3e8799e-aa37-42e4-bdfb-37fd5e2f4a66
// priority: 0
// delivery_mode:  2
// headers:  
//   argsrepr: ()
//   eta:  undefined
//   expires:  undefined
//   group:  undefined
//   group_index:  undefined
//   id: c3e8799e-aa37-42e4-bdfb-37fd5e2f4a66
//   kwargsrepr: {'hi': 'world'}
//   lang: py
//   origin: gen73448@Mac-mini.hitronhub.home
//   parent_id:  undefined
//   retries:  0
//   root_id:  c3e8799e-aa37-42e4-bdfb-37fd5e2f4a66
//   shadow: undefined
//   task: tasks.hello
//   timelimit:  undefined
//               undefined
// content_encoding: utf-8
// content_type: application/json

    var headers = {
      argsrepr: [],
      id: "asdf-asdf-asdf-asdf",
      kwargsrepr: {'hi':'world'},
      lang: "py",
      orign: "test@mycomputer",
      retries: 0,
      root_id: "asdf-asdf-asdf-asdf",
      task: "tasks.hello"
    }
    var beep = {
      boop: "beep"
    }
    var body = JSON.stringify([[], {"hi": "world"}, {"callbacks": null, "errbacks": null, "chain": null, "chord": null}])
    client.publish({destination: "/queue/systopia", beep: beep, headers: headers, body: body})
    // client.publish({ destination: '/queue/systopia/celery', body: JSON.stringify(msg)});
  
*/


  }

  const handleClick = () => {
    
    var temp = [...stagedSets]
    temp.push({_id:null, label:"","queries":[]})
    setStagedSets(temp)
  }

  return (
    <div key="containerkey">
      <MenuBar 
        callback={start} 
        connected={props.isConnected} 
      />
      <div id="workspace" key="workspacekey">
        {databaseDocSets ? docsetlist() : null}
      </div>
    </div>
  );
}
