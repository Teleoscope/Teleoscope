import { Client } from "@stomp/stompjs";
import crypto from 'crypto';
import { createContext, useContext } from "react";
import { store } from "@/stores/store";
import { OID_UID_SYNC } from "@/actions/windows";
import { WebsocketBuilder } from "websocket-ts";
Object.assign(global, WebsocketBuilder);

export const StompContext = createContext(null);
export const useStomp = () => useContext(StompContext);

/**
 * Type definition for Body
 */
interface Body {
  task: string;
  args: any;
}


export class Stomp {
  private _userid: string;
  private _database: string;
  private _workflow: string;
  private _workspace: string;
  private client: Client | null;
  private static stomp: Stomp;
  private creationTime: Date;
  private _loaded: boolean;
  private _replyToQueue: string;

  private constructor({userid = undefined}) {
    this.creationTime = new Date();
    this.loaded = false;
    this.client = null;
    if (userid) {
      this._userid = userid;
    }
  }

  public static getFakeClient(): Stomp {
    if (!Stomp.stomp) {
      Stomp.stomp = new Stomp({});
      Stomp.stomp.fake_client_init();
    }
    return Stomp.stomp;
  }

  /**
   * Ensure that there is only one copy of the Stomp class.
   * @returns Stomp
   */
  public static getInstance({userid = undefined}): Stomp {
    console.log(`New instance of stomp requested with userid ${userid}.`)
    if (!Stomp.stomp) {
      console.log(`Creating new Stomp object. This should only be called once.`)
      Stomp.stomp = new Stomp({userid: userid});
    }
    return Stomp.stomp;
  } 

  public static stop() {
    this.client?.deactivate();
  }

  public restart(): Stomp {
    return Stomp.getInstance({})
  }
  
  public set userId(userid: string) {
    if (!this._userid && userid) {
      this._userid = userid;
      this.client_init()
    }
  }

  public get userId() {
    return this._userid;
  }

  private set loaded(l: boolean) {
    this._loaded = l;
  }

  public get loaded() {
    return this._loaded;
  }

  public set database(db: string) {
    this._database = db;
  }

  public get database() {
    return this._database;
  }

  public set workflow(db: string) {
    this._workflow = db;
  }

  public get workflow() {
    return this._workflow;
  }

  public set workspace(db: string) {
    this._workspace = db;
  }

  public get workspace() {
    return this._workspace;
  }



  fake_client_init() {
    this.client = {
      publish: (...args) => console.log(args),
    };
  }

  /**
   * Initializes the client (there should only be one)
   */
  client_init() {
    console.log(`Initializing Stomp client for user ${this.userId}.`);
    if (this.userId == null || this.client) {
      console.log(`Failed to initialize Stomp client for user ${this.userId}.`);
      return;
    }

    this.client = new Client({
      brokerURL: `wss://${process.env.NEXT_PUBLIC_WEBSOCKET_HOST}/ws`,
      connectHeaders: {
        login: process.env.NEXT_PUBLIC_RABBITMQ_USERNAME!,
        passcode: process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD!,
        host: process.env.NEXT_PUBLIC_RABBITMQ_VHOST!,
      },
      debug: function (str) {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });    

    this.client.onDisconnect = (frame) => {
      console.log("Disconnected", frame);
    }

    this.client.onWebSocketClose = (event) => {
      console.log("Connection closed.", event)
    }
  
    this.client.onWebSocketError = (event) => {
      console.log("Websocket error.", event)
    }

    this.client.onUnhandledFrame = (frame) => {
      console.log("Unhandled frame.", frame)
    }

    /**
     * Called when the client connects to RabbitMQ.
     */
    this.client.onConnect = (frame) => {
      Stomp.stomp.loaded = true;
      // Do something, all subscribes must be done is this callback
      // This is needed because this will be executed after a (re)connect
      const queuehash = crypto.randomBytes(8).toString('hex');
      this._replyToQueue = `/queue/${this.userId}%${queuehash}`

      const headers = {
        "auto-delete": "true",
        "exclusive": "true"
      }

      this.client.subscribe(this._replyToQueue, (message) => {
        // Parse the message body
        const body = JSON.parse(message.body);
        
        console.log("Received: ", body);

        if (body.action == "OID_UID_SYNC") {
          console.log("Received and dispatching OID_UID_SYNC", body)
          store.dispatch(OID_UID_SYNC(body));
        }

      }, headers);
      
      console.log("Connected to RabbitMQ webSTOMP server.", frame);
    };

    /**
     * Called if there's an error connecting to RabbitMQ.
     */
    this.client.onStompError = function (frame) {
      // Will be invoked in case of error encountered at Broker
      // Bad login/passcode typically will cause an error
      // Complaint brokers will set `message` header with a brief message. Body may contain details.
      // Compliant brokers will terminate the connection after any error
      console.log("Broker reported error: " + frame.headers["message"]);
      console.log("Additional details: " + frame.body);
    };

    this.client.activate();
  }

  /**
   * Publishes a message to RabbitMQ.
   */
  publish(body: Body) {
    
    // Default arguments
    
    // strictly required
    body["args"]["userid"] = this.userId;
    // mostly required
    body["args"]["database"] = this.database;
    body["args"]["workflow"] = this.workflow;
    body["args"]["workspace"] = this.workspace;
    body["args"]["message_id"] = crypto.randomBytes(8).toString('hex');
    body["args"]["replyTo"] = this._replyToQueue;
    
    const headers = {
      "content_type": "application/json",
      "content_encoding": "utf-8",
      // "reply-to": `${body["message_id"]}`
    };

    if (!this.client && this._userid) {
      this.client_init()
    }
    
    try {
      this.client.publish({
        destination: `/queue/${process.env.NEXT_PUBLIC_RABBITMQ_QUEUE}`,
        headers: headers,
        body: JSON.stringify(body),
      });
      console.log("Sent from Stomp: ", body);
    } catch(err) {
      console.log("Error in sending:", err, body);
    }
    return body;
  
  }


  /**
   * Initializes a workspace.
   */
  initialize_workspace(label: string, datasource: string) {
    const body = {
      task: "initialize_workspace",
      args: {
        label: label,
        datasource: datasource,
      },
    };
    this.publish(body);
    return body;
  }



  /**
   * Requests to create a new session object in MongoDB.
   */

  initialize_session(label: string, color: string) {
    const body = {
      task: "initialize_session",
      args: {
        label: label,
        color: color,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Saves the workspace UI state (window locations, bookmarks)
   */
  save_UI_state(session_id: string, bookmarks, windows, edges) {
    const body = {
      task: "save_UI_state",
      args: {
        session_id: session_id,
        bookmarks: bookmarks,
        windows: windows,
        nodes: windows,
        edges: edges,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Updates Teleoscopes
   */
  update_edges(session_id: string, edges, state) {
    const body = {
      task: "update_edges",
      args: {
        session_id,
        edges: edges,
        state: state
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Single edge update.
   */
  make_edge({session_id, source_node, target_node, handle_type, connection, ui_state}) {
    const body = {
      task: "make_edge",
      args: {
        session_id: session_id,
        source_node: source_node,
        target_node: target_node,
        handle_type: handle_type,
        connection: connection,
        ui_state: ui_state
      },
    };
    console.log("makeEdge stomp", body, this)
    this.publish(body);
    return body;
  }

  /**
   * adds user to userlist of a session in MongoDB.
   */
  add_user_to_session(contributor_id: string, session_id: string) {
    const body = {
      task: "add_user_to_session",
      args: {
        contributor_id: contributor_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Requests to create a Teleoscope object in MongoDB.
   */
  initialize_teleoscope(session_id: string, label: string) {
    const body = {
      task: "initialize_teleoscope",
      args: {
        session_id: session_id,
        label: label,
      },
    };
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
        password: password,
      },
    };
    this.publish(body);
    return body;
  }

  /*
  Pushes the user account information to create their account
*/
  register_account(username: string, password) {
    const body = {
      task: "register_account",
      args: {
        password: password,
        username: username,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Requests to create a new group object in MongoDB.
   */
  add_group(label: string, color: string, session_id: string, documents = []) {
    const body = {
      task: "add_group",
      args: {
        label: label,
        color: color,
        session_id: session_id,
        documents: documents,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Requests to copy cluster to groups in MongoDB.
   */
  copy_cluster(cluster_id: string, session_id: string) {
    const body = {
      task: "copy_cluster",
      args: {
        cluster_id: cluster_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Requests to copy group object in MongoDB.
   */
  copy_group(label: string, group_id: string, session_id: string) {
    const body = {
      task: "copy_group",
      args: {
        label: label,
        group_id: group_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Removes a group from a session in MongoDB. Does not delete the group.
   *
   * @param group_id
   * @param session_id
   * @returns
   */
  remove_group(group_id: string, session_id: string) {
    const body = {
      task: "remove_group",
      args: {
        group_id: group_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Removes a cluster from a projection in MongoDB. 
   *
   * @param cluster_id
   * @param projection_id
   * @returns
   */
  remove_cluster(cluster_id: string, projection_id: string) {
    const body = {
      task: "remove_cluster",
      args: {
        cluster_id: cluster_id,
        projection_id: projection_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Removes a group from a session in MongoDB. Does not delete the group.
   *
   * @param teleoscope_id
   * @param session_id
   * @returns
   */
  remove_teleoscope(teleoscope_id: string, session_id: string) {
    const body = {
      task: "remove_teleoscope",
      args: {
        teleoscope_id: teleoscope_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Add a document to a group.
   */
  add_document_to_group(group_id: string, document_id: string) {
    const body = {
      task: "add_document_to_group",
      args: {
        group_id: group_id,
        document_id: document_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Remove a document from a group.
   */
  remove_document_from_group(group_id: string, document_id: string) {
    const body = {
      task: "remove_document_from_group",
      args: {
        group_id: group_id,
        document_id: document_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Update a group's label.
   */
  update_group_label(group_id: string, label: string) {
    const body = {
      task: "update_group_label",
      args: {
        group_id: group_id,
        label: label,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Request to add a note for a particular interface object.
   */
  add_note(session_id: string, label = "new note", content = {}) {
    const body = {
      task: "add_note",
      args: {
        session_id: session_id,
        label: label,
        content: content
      },
    };
    this.publish(body);
    return body;
  }

  /**
     * Removes a session from a user in MongoDB. Does not delete the session.
    */
  remove_session(session_id: string) {
    const body = {
      task: "remove_session",
      args: {
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Request to add a note for a particular interface object.
   */
  remove_note(note_id: string, session_id: string) {
    const body = {
      task: "remove_note",
      args: {
        note_id: note_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Updates a note's content.
   */
  update_note(note_id: string, content) {
    const body = {
      task: "update_note",
      args: {
        note_id: note_id,
        content: content,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Relabels a note.
   */
  relabel_note(note_id: string, label: string) {
    const body = {
      task: "relabel_note",
      args: {
        note_id: note_id,
        label: label,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Reorients the Teleoscope to the positive_docs and away from the negative_docs.
   */
  reorient(
    teleoscope_id: string,
    positive_docs: Array<string>,
    negative_docs: Array<string>,
    magnitude?: number
  ) {
    const body = {
      task: "reorient",
      args: {
        teleoscope_id: teleoscope_id,
        positive_docs: positive_docs,
        negative_docs: negative_docs,
      },
    };
    if (magnitude != null) {
      body.args["magnitude"] = magnitude;
    }
    this.publish(body);
    return body;
  }

  /**
   * Recolor the session.
   */

  recolor_workflow(color: string, session_oid: string) {
    const body = {
      task: "recolor_workflow",
      args: {
        color: color,
        session_id: session_oid,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Recolor the group.
   */

  recolor_group(color: string, group_id: string) {
    const body = {
      task: "recolor_group",
      args: {
        color: color,
        group_id: group_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Relabel the group.
   */

  relabel_group(label: string, group_id: string) {
    const body = {
      task: "relabel_group",
      args: {
        label: label,
        group_id: group_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Relabel the session.
   */

  relabel_workflow(label: string, relabeled_workflow_id: string) {
    const body = {
      task: "relabel_workflow",
      args: {
        label: label,
        relabeled_workflow_id: relabeled_workflow_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Relabel the teleoscope.
   */

  relabel_teleoscope(label: string, teleoscope_id: string) {
    const body = {
      task: "relabel_teleoscope",
      args: {
        label: label,
        teleoscope_id: teleoscope_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Create MLGroups using the UMAP and HBDSCAN with the given groups' documents as seeds.
   */
  cluster_by_groups(group_id_strings: Array<string>, projection_id: string, session_oid: string) {
    const body = {
      task: "cluster_by_groups",
      args: {
        group_id_strings: group_id_strings,
        projection_id: projection_id,
        session_oid: session_oid,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Marks a document read or unread.
   * @param document_id 
   * @param read 
   * @returns 
   */
  mark(document_id: string, session_id: string, read: boolean) {
    const body = {
      task: "mark",
      args: {
        document_id: document_id,
        session_id: session_id,
        read: read
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Create Snippet
   */
  snippet(document_id: string, session_id: string, text: string ) {
    const body = {
      task: "mark",
      args: {
        document_id: document_id,
        session_id: session_id,
        text: text
      },
    };
    this.publish(body);
    return body;
  } 

  /**
   * Add a workspace item to the interface.
   */
  add_item(session_id: string, oid: string, uid: string, type: string, options = {}, state = {}) {
    const body = {
      task: "add_item",
      args: {
        session_id: session_id,
        oid: oid,
        uid: uid,
        type: type,
        options: options,
        state: state
      },
    };
    this.publish(body);
    return body;
  }


  /**
   * Ping temporary queue.
   */
  ping(args) {
    const body = {
      task: "ping",
      args: {
        message: "ping",
        ...args,
      },
    };
    this.publish(body);
    return body;
  }


  /**
   * Requests to create a projection object in MongoDB.
   */
  initialize_projection(session_id: string, label: string) {
    const body = {
      task: "initialize_projection",
      args: {
        session_id: session_id,
        label: label,
      },
    };
    this.publish(body);
    return body;
  }

  /**
   * Deletes a projection
   *
   * @param projection_id
   * @param session_id
   * @returns
   */
  remove_projection(projection_id: string, session_id: string) {
    const body = {
      task: "remove_projection",
      args: {
        projection_id: projection_id,
        session_id: session_id,
      },
    };
    this.publish(body);
    return body;
  }

  /**
  * Relabel the projection.
  */
  relabel_projection(label: string, projection_id: string) {
    const body = {
      task: "relabel_projection",
      args: {
        label: label,
        projection_id: projection_id,
      },
    };
    this.publish(body);
    return body;
  }

}

