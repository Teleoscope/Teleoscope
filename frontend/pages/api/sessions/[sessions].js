import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { session } = req.query;
  const current = await db.collection("sessions").findOne({sessions_id: session});
  res.json(current);
};
