
/**
 * /api/workspace/[args]
 * args[0]: label
 * args[1]: datasource 
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import withSecureSession from "@/util/withSecureSession";

import send from '@/util/amqp';

async function initalizeWorkspaceHandler(req, res, session) {
  const parameters = req.body;
  
  const args = {
    userid: session.user.id,
    label: parameters.label,
    datasource: parameters.datasource
  }

  await send('initialize_workspace', args)

  res.status(200).json({ status: 'Message sent' });

  return res.json({"status": "success"})
}

export default withSecureSession(initalizeWorkspaceHandler)