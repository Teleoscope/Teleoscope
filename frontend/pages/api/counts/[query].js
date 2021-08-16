import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { query } = req.query;
  const count = await db
    .collection("posts")
    .countDocuments({ $text: { $search: query } });
  res.json(count);
};
