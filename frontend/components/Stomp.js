import { Client, Message } from "@stomp/stompjs";
// TODO: look at websocket example code here and replicate
// anywhere that needs to route a request to the server
// possibly best to move this into an action? I'm unsure
Object.assign(global, { WebSocket: require('websocket').w3cwebsocket });

// enforcing light singleton pattern
var g_client;

export function client_init() {
  if (g_client) {
    return g_client;
  }
  console.log("Initializing Stomp client...")
  const client = new Client({
    brokerURL: `ws://${process.env.NEXT_PUBLIC_RABBITMQ_HOST}:3311/ws`,
    connectHeaders: {
      login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME,
      passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD,
      host: process.env.NEXT_PUBLIC_RABBITMQ_VHOST,
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

  client.onStompError = function (frame) {
    // Will be invoked in case of error encountered at Broker
    // Bad login/passcode typically will cause an error
    // Complaint brokers will set `message` header with a brief message. Body may contain details.
    // Compliant brokers will terminate the connection after any error
    console.log('Broker reported error: ' + frame.headers['message']);
    console.log('Additional details: ' + frame.body);
  };

  client.activate();
  g_client = client;
  return client;
}

export function publish(client, body) {
  var headers = {};
  client.publish({
    destination: "/queue/" + process.env.NEXT_PUBLIC_RABBITMQ_VHOST, // TODO: rename queue
    headers: headers,
    body: JSON.stringify(body),
  });
  console.log("sent", body);
  return body;
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
  return body;
}

export function initialize_teleoscope(client, search_term, session_id) {
  var body = {
    task: 'initialize_teleoscope',
    args: {
      label: search_term,
      session_id: session_id
    }
  }
  publish(client, body);
  return body;
}

export function save_teleoscope_state(client, _id, history_item) {
  //const obj_id = ObjectId(_id);
  var body = {
    task: 'save_teleoscope_state',
    args: {
      _id: _id,
      history_item: history_item
    }
  }
  console.log("The object id is: " + _id);
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
  return body;
}

export function initialize_session(client, username) {
  var body = {
    task: 'initialize_session',
    args: {
      username: username,
    }
  }
  publish(client, body);
  return body;
}

export function add_group(client, label, color) {
  var body = {
    task: 'add_group',
    args: {
      label: label,
      color: color
    }
  }
}