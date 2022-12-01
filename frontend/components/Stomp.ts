import { Client } from "@stomp/stompjs";

// TODO: look at websocket example code here and replicate
// anywhere that needs to route a request to the server
// possibly best to move this into an action? I'm unsure

import { WebsocketBuilder } from 'websocket-ts';
Object.assign(global, WebsocketBuilder);
//Object.assign(global, { WebSocket: require('websocket').w3cwebsocket });


// custom imports
const bcrypt = require('bcryptjs');
let client: Client;

/**
 * Type definition for Body
 */
interface Body {
  task: string,
  args: Object
}

export class Stomp {

  private _userid: string;
  private client: Client;
  private static stomp: Stomp;

  private constructor() {
  }

  /**
   * Ensure that there is only one copy of the Stomp class.
   * @returns 
   */
  public static getInstance(): Stomp {
    if (!Stomp.stomp) {
      Stomp.stomp = new Stomp();
      Stomp.stomp.client_init();
    }
    return Stomp.stomp;
  }

  public set userId(userid: string) {
    this._userid = userid;
  }

  public get userId() {
    return this._userid;
  }

  /**
   * Initializes the client (there should only be one)
   */
  client_init() {
    console.log("Initializing Stomp client...")
    this.client = new Client({
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
    this.client.onConnect = function (frame) {
      // Do something, all subscribes must be done is this callback
      // This is needed because this will be executed after a (re)connect
      console.log("Connected to RabbitMQ webSTOMP server.");
    };

    /**
     * Called if there's an error connecting to RabbitMQ.
     */
    this.client.onStompError = function (frame) {
      // Will be invoked in case of error encountered at Broker
      // Bad login/passcode typically will cause an error
      // Complaint brokers will set `message` header with a brief message. Body may contain details.
      // Compliant brokers will terminate the connection after any error
      console.log('Broker reported error: ' + frame.headers['message']);
      console.log('Additional details: ' + frame.body);
    };

    this.client.activate();
  }


  /**
   * Publishes a message to RabbitMQ.
   */
  publish(body: Body) {
    var headers = { content_type: "application/json", content_encoding: "utf-8" };
    body['args']['userid'] = this.userId;
    this.client.publish({
      destination: `/queue/${process.env.NEXT_PUBLIC_RABBITMQ_QUEUE}`,
      headers: headers,
      body: JSON.stringify(body),
    });
    console.log("Sent from Stomp: ", body);
    return body;
  }

  /**
   * Requests to create a new session object in MongoDB.
   */

  initialize_session(label: string, color: string) {
    var body = {
      task: 'initialize_session',
      args: {
        label: label,
        color: color,
      }
    }
    this.publish(body);
    return body;
  }

  /**
   * Saves the workspace UI state (window locations, bookmarks)
   */
  save_UI_state(session_id: string, bookmarks, windows) {
    var body = {
      task: 'save_UI_state',
      args: {
        session_id: session_id,
        bookmarks: bookmarks,
        windows: windows,
      }
    }
    this.publish(body);
    return body;
  }

  /**
   * adds user to userlist of a session in MongoDB.
   */
  add_user_to_session(current: string, session_id: string) {
    var body = {
      task: 'add_user_to_session',
      args: {
        current: current,
        session_id: session_id,
      }
    }
    this.publish(body);
    return body;
  }

  /**
   * Requests to create a Teleoscope object in MongoDB.
   */
  initialize_teleoscope(session_id: string) {
    var body = {
      task: 'initialize_teleoscope',
      args: {
        session_id: session_id
      }
    }
    this.publish(body);
    return body;
  }

/*
  Adds the users login credentials for verification
*/
add_login(username: string, password: string) {
  const body = {
    task: "add_login",
    args: {
      username: username,
      password: password
    }
  }
  this.publish(body);
  return body;
}

/*
  Pushes the user account information to create their account
*/
register_account(jsonData) {
  const { firstName, lastName, username, password } = jsonData;

  //hash(password) the function uses the bcrypt hashing algorithm for now
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);


  const body = {
    task: "register_account",
    args: {
      firstName: firstName,
      lastName: lastName,
      password: hashedPassword,
      username: username,
    }

    //   firstName: "Kenneth"
    //   lastName: "Averna"
    //   password: "teleoscope"
    //   username: "admin@teleoscope.com"
  }
  this.publish(body);
  return body;
}

/**
 * Saves a Teleoscope history item.
 */
save_teleoscope_state(_id: string, history_item) {
  //const obj_id = ObjectId(_id);
  var body = {
    task: 'save_teleoscope_state',
    args: {
      _id: _id,
      history_item: history_item
    }
  }
  this.publish(body);
  return body;
}

/**
 * Requests to create a new group object in MongoDB.
 */
add_group(label: string, color: string, session_id: string) {
  var body = {
    task: 'add_group',
    args: {
      session_id: session_id,
      label: label,
      color: color
    }
  }
  this.publish(body);
  return body;
}

/**
 * Requests to copy group object in MongoDB.
 */
copy_group(label: string, group_id: string, session_id: string) {
  var body = {
    task: 'copy_group',
    args: {
      label: label,
      group_id: group_id,
      session_id: session_id,
    }
  }
  this.publish(body);
  return body;
}

/**
 * Add a document to a group.
 */
add_document_to_group(group_id: string, document_id: string) {
  var body = {
    task: 'add_document_to_group',
    args: {
      group_id: group_id,
      document_id: document_id
    }
  }
  this.publish(body);
  return body;
}

/**
 * Remove a document from a group.
 */
remove_document_from_group(group_id: string, document_id: string) {
  var body = {
    task: 'remove_document_from_group',
    args: {
      group_id: group_id,
      document_id: document_id
    }
  }
  this.publish(body);
  return body;
}

/**
 * Update a group's label.
 */
update_group_label(group_id: string, label: string) {
  var body = {
    task: 'update_group_label',
    args: {
      group_id: group_id,
      label: label
    }
  }
  this.publish(body);
  return body;
}

/**
 * Request to add a note for a particular document.
 */
add_note(document_id: string) {
  var body = {
    task: 'add_note',
    args: {
      document_id: document_id,
    }
  }
  this.publish(body);
  return body;
}

/**
 * Updates a note's content.
 */
update_note(document_id: string, content) {
  var body = {
    task: 'update_note',
    args: {
      document_id: document_id,
      content: content
    }
  }
  this.publish(body);
  return body;
}

/**
 * Reorients the Teleoscope to the positive_docs and away from the negative_docs.
 */
reorient(teleoscope_id: string, positive_docs: Array<string>, negative_docs: Array<string>, magnitude ?: number) {
  var body = {
    task: "reorient",
    args: {
      teleoscope_id: teleoscope_id,
      positive_docs: positive_docs,
      negative_docs: negative_docs,
    }
  }
  if (magnitude != null) {
    body.args["magnitude"] = magnitude;
  }
  this.publish(body);
  return body;
}

/**
 * Create MLGroups using the UMAP and HBDSCAN with the given groups' documents as seeds.
 */
cluster_by_groups(group_id_strings: Array<string>, session_oid: string) {
  var body = {
    task: "cluster_by_groups",
    args: {
      group_id_strings: group_id_strings,
      session_oid: session_oid,
    }
  }
  this.publish(body);
  return body;
}
  
}