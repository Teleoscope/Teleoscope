import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { projections } = req.query;
  const projection = await db
    .collection("projections")
    .findOne({ _id: new ObjectId(projections) });
  res.json(projection);
};
