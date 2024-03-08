import withSecureSession from "@/util/withSecureSession";
import { MongoClient } from "mongodb";
import { ObjectId } from "bson";

async function handler(req, res) {

  const client = await new MongoClient(process.env.MONGODB_REGISTRAR_URI).connect();
  const db = await client.db("users");

  const workspaces = await db
    .collection("workspaces")
    .find(
      {"$or": [
        {owner: new ObjectId(session.user.id)},
        {contributors: {$elemMatch: {id: new ObjectId(session.user.id)}}}
      ]}
    ).toArray();

  return res.json(workspaces)
}

export default withSecureSession(handler)