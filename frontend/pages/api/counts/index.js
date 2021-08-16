import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const count = await db.collection("posts").countDocuments({});
  res.json(count);
};
