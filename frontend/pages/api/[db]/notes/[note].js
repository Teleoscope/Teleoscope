import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { note } = req.query;
  const current = await db
    .collection("notes")
    .findOne({ oid: new ObjectId(note) });
  res.json(current);
};
