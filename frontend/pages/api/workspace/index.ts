
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


  return res.json({"status": "success"})
}