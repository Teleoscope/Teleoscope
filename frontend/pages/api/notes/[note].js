import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { note } = req.query;
  const current = await db.collection("notes").findOne({postid: note});
  res.json(current);
};
