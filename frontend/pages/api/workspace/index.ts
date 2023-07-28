
/**
 * /api/workspace/[args]
 * args[0]: label
 * args[1]: datasource 
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  const parameters = req.body;

  if (req.method != "POST") {
    return null
  }
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    res.status(401).json({ message: "You must be logged in to access.", session: session });
    return;
  }


  const connection = await amqp.connect(`amqp://${process.env.NEXT_PUBLIC_RABBITMQ_USERNAME}:${process.env.NEXT_PUBLIC_RABBITMQ_PASSWORD}@localhost:5672/${process.env.NEXT_PUBLIC_RABBITMQ_VHOST}`);
  const channel = await connection.createChannel();
  const queue = `${process.env.NEXT_PUBLIC_RABBITMQ_QUEUE}`;
  channel.assertQueue(queue, { durable: true });

  const taskMessage = {
    id: uuidv4(),
    task: 'intitialize_workflow',
    args: {
      userid: session.user.id,
      label: parameters.label,
      datasource: parameters.datasource

    },
    kwargs: {
      userid: session.user.id,
      label: parameters.label,
      datasource: parameters.datasource

    },
    retries: 0,
    eta: new Date().toISOString()
  };
  const msg = JSON.stringify(taskMessage);


  channel.sendToQueue(queue, Buffer.from(msg), {
    persistent: true
  });

  console.log(" [x] Sent '%s'", msg);
  res.status(200).json({ status: 'Message sent' });

  // Make sure the network buffers have been flushed and close connection
  await channel.close();
  await connection.close();
  

  // const client = Stomp.getInstance({userid: session.user.id})
  // await client.wait_for_client_connection()
  // client.initialize_workspace(parameters.label, parameters.datasource)
  // await client.wait_for_client_disconnection()
  

  return res.json({"status": "success"})
}