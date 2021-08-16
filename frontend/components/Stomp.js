import Stomp from 'stompjs'


export function connectRabbit(){
    console.log("Running connectRabbit")
    let client

    var ws = new WebSocket('ws://localhost:3311/ws')

    const headers = {
        'login': 'phb_remote',
        'passcode': 'XABNBvVbfA63QFY3BTep9or',
        'durable': 'true',
        'auto-delete': 'false'
    }
    client = Stomp.over(ws)

    var on_connect = function (frame) {
        console.log('Connected to RabbitMQ!', frame)
        id = client.subscribe('/queue/systopia', function(d) {
          console.log(d)  
          send("msg me")
      })
      
    }

    var send = function(data) {
      client.send('/topic/bunny', {}, data);
    }

    var on_error = function (res) {
      console.log('error', res)
    }

    var on_close = function (res) {
      console.log('close', res)
    }

    client.connect(headers , on_connect, on_error, on_close, "/queue/systopia")
    
}

// import React from 'react';
// import SockJsClient from 'react-stomp';
// 
// class SampleComponent extends React.Component {
//   constructor(props) {
//     super(props);
//   }
// 
//   sendMessage = (msg) => {
//     this.clientRef.sendMessage('/topics/all', msg);
//   }
// 
//   render() {
//     return (
//       <div>
//         <SockJsClient url='http://localhost:8080/ws' topics={['/topics/all']}
//             onMessage={(msg) => { console.log(msg); }}
//             ref={ (client) => { this.clientRef = client }} />
//       </div>
//     );
//   }
// }