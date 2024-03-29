import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { group } = req.query;
  const current = await db
    .collection("groups")
    .findOne(
      { _id: new ObjectId(group) },
      { projection: { history: { $slice: 1 } } }
    );
  res.json(current);
};
