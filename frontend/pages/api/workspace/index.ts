
/**
 * /api/workspace/[args]
 * args[0]: label
 * args[1]: datasource 
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";
import { Stomp } from '@/util/Stomp';

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

  const client = Stomp.getInstance({userid: session.user.id})
  await client.wait_for_client_connection()
  client.initialize_workspace(parameters.label, parameters.datasource)
  await client.wait_for_client_disconnection()
  

  return res.json({"status": "success"})
}