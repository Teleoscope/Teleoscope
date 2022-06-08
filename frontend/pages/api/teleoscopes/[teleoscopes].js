import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { teleoscopes } = req.query;
  const teleoscope = await db.collection("teleoscopes").findOne({_id: ObjectId(teleoscopes)});
  res.json(teleoscope);
};
