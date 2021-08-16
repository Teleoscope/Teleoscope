import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const queries = await db.collection("queries").find({}).limit(20).toArray();
  res.json(queries);
};
