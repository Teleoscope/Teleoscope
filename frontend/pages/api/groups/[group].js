import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { session } = req.query;
  const current = await db.collection("group").findOne({_id: ObjectId(group)});
  res.json(current);
};
