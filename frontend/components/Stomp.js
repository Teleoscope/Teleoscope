// Stomp.js
import { Client, Message } from '@stomp/stompjs';


const client = new StompJs.Client({
  brokerURL: 'ws://localhost:3311/ws',
  connectHeaders: {
    login: 'phb2',
    passcode: 'changeme',
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

client.onStompError = function (frame) {
  // Will be invoked in case of error encountered at Broker
  // Bad login/passcode typically will cause an error
  // Complaint brokers will set `message` header with a brief message. Body may contain details.
  // Compliant brokers will terminate the connection after any error
  console.log('Broker reported error: ' + frame.headers['message']);
  console.log('Additional details: ' + frame.body);
};

client.activate();



client.publish({ destination: '/topic/general', body: 'Hello world' });

// There is an option to skip content length header
client.publish({
  destination: '/topic/general',
  body: 'Hello world',
  skipContentLengthHeader: true,
});

// Additional headers
client.publish({
  destination: '/topic/general',
  body: 'Hello world',
  headers: { priority: '9' },
});


var subscription = client.subscribe('/queue/test', callback);
callback = function (message) {
  // called when the client receives a STOMP message from the server
  if (message.body) {
    alert('got message with body ' + message.body);
  } else {
    alert('got empty message');
  }
};





  public asTaskV2(
    taskId: string,
    taskName: string,
    args?: Array<any>,
    kwargs?: object
  ): TaskMessage {
    const message: TaskMessage = {
      headers: {
        lang: "js",
        task: taskName,
        id: taskId
        /*
        'shadow': shadow,
        'eta': eta,
        'expires': expires,
        'group': group_id,
        'retries': retries,
        'timelimit': [time_limit, soft_time_limit],
        'root_id': root_id,
        'parent_id': parent_id,
        'argsrepr': argsrepr,
        'kwargsrepr': kwargsrepr,
        'origin': origin or anon_nodename()
        */
      },
      properties: {
        correlationId: taskId,
        replyTo: ""
      },
      body: [args, kwargs, {}],
      sentEvent: null
    };
  }
