import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { group } = req.query;
  const current = await db.collection("groups").find({$text: {$search: group}}).toArray();
  res.json(current);
};