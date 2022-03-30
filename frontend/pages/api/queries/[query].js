import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { query } = req.query;
  const query_meta = await db
    .collection("clean.posts.v2")
    .find({ $text: { $search: query } }).limit(50).toArray();
  res.json(query_meta);
};
