import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const groups = await db.collection("groups").find({}).toArray();
  res.json(groups);
};
