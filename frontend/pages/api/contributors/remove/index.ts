
/**
 * /api/contributors/
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import withSecureSession from "@/util/withSecureSession";
import send from '@/util/amqp';

async function handler(req, res, session) {
  const args = req.body;

  if (req.method != "POST") {
    return null
  }
  
  args["userid"] = session.user.id
  
  await send('remove_contributor', args)

  return res.json({"status": "success"})
}

export default withSecureSession(handler)