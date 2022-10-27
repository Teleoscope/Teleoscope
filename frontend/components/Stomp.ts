import { Client } from "@stomp/stompjs";
// TODO: look at websocket example code here and replicate
// anywhere that needs to route a request to the server
// possibly best to move this into an action? I'm unsure
import {WebsocketBuilder} from 'websocket-ts';
//Object.assign(global, { WebSocket: require('websocket').w3cwebsocket });
Object.assign(global, WebsocketBuilder);
//const bcrypt = require('bcrypt');

let client;

/**
 * Initializes the client (there should only be one)
 */
export function client_init() {
  console.log("Initializing Stomp client...")
  client = new Client({
    brokerURL: `ws://${process.env.NEXT_PUBLIC_RABBITMQ_HOST}:15674/ws`,
    connectHeaders: {
      login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME!,
      passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD!,
      host: process.env.NEXT_PUBLIC_RABBITMQ_VHOST!,
    },
    debug: function (str) {
      console.log(str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  /**
   * Called when the client connects to RabbitMQ.
   */
  client.onConnect = function (frame) {
    // Do something, all subscribes must be done is this callback
    // This is needed because this will be executed after a (re)connect
    console.log("Connected to RabbitMQ webSTOMP server.");
  };

  /**
   * Called if there's an error connecting to RabbitMQ.
   */
  client.onStompError = function (frame) {
    // Will be invoked in case of error encountered at Broker
    // Bad login/passcode typically will cause an error
    // Complaint brokers will set `message` header with a brief message. Body may contain details.
    // Compliant brokers will terminate the connection after any error
    console.log('Broker reported error: ' + frame.headers['message']);
    console.log('Additional details: ' + frame.body);
  };

  client.activate();
  return client;
}

/**
 * Type definition for Body
 */
interface Body {
  task: string,
  // args: Object
  args: Record<string, unknown>
}

/**
 * Publishes a message to RabbitMQ.
 */
export function publish(client: Client, body: Body) {
  const headers = {};
  client.publish({
    destination: "/queue/" + process.env.NEXT_PUBLIC_RABBITMQ_VHOST, // TODO: rename queue
    headers: headers,
    body: JSON.stringify(body),
  });
  console.log("Sent from Stomp: ", body);
  return body;
}

/**
 * Requests to create a new session object in MongoDB.
 */

export function initialize_session(client: Client, username: string, label: string, color: string) {
  const body = {
    task: 'initialize_session',
    args: {
      username: username,
      label: label,
      color: color
    }
  }
  publish(client, body);
  return body;
}

/**
 * adds user to userlist of a session in MongoDB.
 */
export function add_user_to_session(client: Client, username: string, session_id: string) {
  const body = {
    task: 'add_user_to_session',
    args: {
      username: username,
      session_id: session_id,

    }
  }
  publish(client, body);
  return body;
}

/**
 * Saves the workspace UI state (window locations, bookmarks)
 */
export function save_UI_state(client: Client, session_id: string, history_item) {
  const body = {
    task: 'save_UI_state',
    args: {
      session_id: session_id,
      history_item: history_item
    }
  }
  publish(client, body);
  return body;
}

/**
 * Requests to create a Teleoscope object in MongoDB.
 */
export function initialize_teleoscope(client: Client, session_id: string) {
  const body = {
    task: 'initialize_teleoscope',
    args: {
      session_id: session_id
    }
  }
  publish(client, body);
  return body;
}

/**
 * Saves a Teleoscope history item.
 */
export function save_teleoscope_state(client: Client, _id: string, history_item) {
  //const obj_id = ObjectId(_id);
  const body = {
    task: 'save_teleoscope_state',
    args: {
      _id: _id,
      history_item: history_item
    }
  }
  publish(client, body);
  return body;
}

/**
 * Requests to create a new group object in MongoDB.
 */
export function add_group(client: Client, label: string, color: string, session_id: string) {
  const body = {
    task: 'add_group',
    args: {
      session_id: session_id,
      label: label,
      color: color
    }
  }
  publish(client, body);
  return body;
}

/**
 * Add a post to a group.
 */
export function add_post_to_group(client: Client, group_id: string, post_id: string) {
  const body = {
    task: 'add_post_to_group',
    args: {
      group_id: group_id,
      post_id: post_id
    }
  }
  publish(client, body)
  return body;
}

/**
 * Remove a post from a group.
 */
export function remove_post_from_group(client: Client, group_id: string, post_id: string) {
  const body = {
    task: 'remove_post_from_group',
    args: {
      group_id: group_id,
      post_id: post_id
    }
  }
  publish(client, body)
  return body;
}

/**
 * Update a group's label.
 */
export function update_group_label(client: Client, group_id: string, label: string) {
  const body = {
    task: 'update_group_label',
    args: {
      group_id: group_id,
      label: label
    }
  }
  publish(client, body)
  return body;
}

/**
 * Request to add a note for a particular post.
 */
export function add_note(client: Client, post_id: string) {
  const body = {
    task: 'add_note',
    args: {
      post_id: post_id,
    }
  }
  publish(client, body);
  return body;
}

/**
 * Updates a note's content.
 */
export function update_note(client: Client, post_id: string, content) {
  const body = {
    task: 'update_note',
    args: {
      post_id: post_id,
      content: content
    }
  }
  publish(client, body);
  return body;
}

/**
 * Reorients the Teleoscope to the positive_docs and away from the negative_docs.
 */
export function reorient(client: Client, teleoscope_id: string, positive_docs: Array<string>, negative_docs: Array<string>, weight?: number) {
  const body = {
    task: "reorient",
    args: {
      teleoscope_id: teleoscope_id, // TODO
      positive_docs: positive_docs,
      negative_docs: negative_docs,
    }
  }
  if (weight) {
    body.args["weight"] = weight;
  }
  publish(client, body);
  return body;
}

/**
 * Create MLGroups using the UMAP and HBDSCAN with the given groups' posts as seeds.
 */
export function cluster_by_groups(client: Client, group_id_strings: Array<string>, session_oid: string) {
  const body = {
    task: "cluster_by_groups",
    args: {
      group_id_strings: group_id_strings,
      session_oid: session_oid,
    }
  }
  publish(client, body);
  return body;
}

/*
  Adds the users login credentials for verification
*/
export function add_login(client, username, password) {
  const body = {
    task: "add_login",
    args: {
      username: username,
      password: password
    }
  }

  publish(client, body);
  return body;
}

/*
  Pushes the user account information to create their account
  //hash password
  const hashedPassword = bcrypt.hashSync(yourPasswordFromSignupForm, bcrypt.genSaltSync());

  //verify password
  const doesPasswordMatch = bcrypt.compareSync(yourPasswordFromLoginForm, yourHashedPassword)
*/
export function register_account(jsonData) {
  //hash(password) the function uses the bcrypt hashing algorithm for now
  //const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

  console.log('json data', jsonData);
  const {firstName, lastName, username, password} = jsonData;
  const body = {
    task: "register_account",
    args: {
      firstName: firstName,
      lastName: lastName,
      password: password,
      username: username,
    }

  //   firstName: "Kenneth"
  //   lastName: "Averna"
  //   password: "teleoscope"
  //   username: "admin@teleoscope.com"
  }

  publish(client, body);
  return body;
}