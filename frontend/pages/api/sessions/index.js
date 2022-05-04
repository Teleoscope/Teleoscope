import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const sessions = await db.collection("sessions").find({}).limit(20).toArray();
  res.json(sessions);
};
