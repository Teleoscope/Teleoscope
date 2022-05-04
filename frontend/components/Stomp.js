import { Client, Message } from "@stomp/stompjs";
// TODO: look at websocket example code here and replicate
// anywhere that needs to route a request to the server
// possibly best to move this into an action? I'm unsure
Object.assign(global, {
WebSocket: websocket.w3cwebsocket,
// Not needed in node 11
TextEncoder: TextEncodingPolyfill.TextEncoder,
TextDecoder: TextEncodingPolyfill.TextDecoder
});

export function client_init() {
  const client = new Client({
    brokerURL: "ws://localhost:3311/ws",
    connectHeaders: {
      login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME,
      passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD,
      host: "systopia", // TODO: rename this
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
  return client;
}

export function publish(client, body) {
  var headers = {};
  client.publish({
    destination: "/queue/systopia", // TODO: rename queue
    headers: headers,
    body: JSON.stringify(body),
  });
  console.log("sent", body);
}

// TODO: These should exactly implement the interface standard
// TODO: Make sure they look like dispatch.py
export function reorient(client, search_term, teleoscope_id, positive_docs, negative_docs) {
  var body = {
    task: "reorient",
    args: {
      query: search_term, // TODO
      teleoscope_id: teleoscope_id, // TODO
      positive_docs: positive_docs,
      negative_docs: negative_docs,
    }
  }
  publish(client, body);
}

export function initialize_teleoscope(client, search_term) {
  var body = {
    task: 'initialize_teleoscope',
    args: {
      query: search_term // TODO: rename consistently
    }
  }
  publish(client, body);
}

export function save_UI_state(client, session_id, history_item) {
  var body = {
    task: 'save_UI_state',
    args: {
      session_id: session_id,
      history_item: history_item
    }
  }
  publish(client, body);
}

export function initialize_session(client) {
  var body = {
    task: 'initialize_session',
    args: {
    }
  }
  publish(client, body);
}
