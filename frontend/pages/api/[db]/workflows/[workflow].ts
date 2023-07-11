import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { workflow } = req.query;
  
  const wf = await db
    .collection("sessions")
    .findOne({ _id: new ObjectId(workflow) }, { projection: { history: { $slice: 1 } } });
  res.json(wf);
};
