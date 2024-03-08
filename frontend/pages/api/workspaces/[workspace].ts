/**
 * /api/workspaces/[workspace]
 * workspace: ObjectID string
 * requires: authenticated user with avaiable session token cookie
 * returns: workspace object from MongoDB
 */

import withSecureSession from "@/util/withSecureSession";
import { MongoClient } from "mongodb";
import { ObjectId } from "bson";

async function handler(req, res, session) {

  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  const db = await client.db("users");

  const workspace = await db
    .collection("workspaces")
    .findOne(new ObjectId(req.query.workspace));

  client.close()

  return res.json(workspace)
}

export default withSecureSession(handler)