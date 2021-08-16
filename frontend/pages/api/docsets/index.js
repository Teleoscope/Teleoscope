import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const docsets = await db.collection("docsets").find({}).limit(20).toArray();
  res.json(docsets);
};

