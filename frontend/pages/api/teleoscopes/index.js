import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const teleoscopes = await db.collection("teleoscopes").find({}).toArray();
  res.json(teleoscopes);
};
