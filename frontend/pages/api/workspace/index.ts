
/**
 * /api/workspace/[args]
 * args[0]: label
 * args[1]: datasource 
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

import send from '@/util/amqp';

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


  const args = {
    userid: session.user.id,
    label: parameters.label,
    datasource: parameters.datasource
  }

  await send('initialize_workspace', args)

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