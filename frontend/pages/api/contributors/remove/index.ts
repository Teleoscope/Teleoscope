
/**
 * /api/contributors/
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getServerSession } from "next-auth/next";
import { Stomp } from '@/util/Stomp';

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

  const client = Stomp.getInstance({userid: session.user.id})
  await client.wait_for_client_connection()
  client.remove_contributor(args.contributor_id, args.workspace_id)
  Stomp.stop()

  return res.json({"status": "success"})
}