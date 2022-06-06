import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { session } = req.query;
  const current = await db.collection("sessions").findOne({_id: ObjectId(session)});
  res.json(current);
};
