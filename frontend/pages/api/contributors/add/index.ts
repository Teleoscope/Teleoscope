
/**
 * /api/contributors/
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";

import send from '@/util/amqp';

export default async function handler(req, res) {
  const args = req.body;

  if (req.method != "POST") {
    return null
  }
  
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    res.status(401).json({ message: "You must be logged in to access.", session: session });
    return;
  }

  args["userid"] = session.user.id
  
  await send('add_contributor', args)

  return res.json({"status": "success"})
}