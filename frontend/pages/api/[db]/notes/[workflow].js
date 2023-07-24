import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { workflow } = req.query;
  const current = await db
    .collection("notes")
    .find({ workflows: new ObjectId(workflow) }).toArray();
  res.json(current);
};
