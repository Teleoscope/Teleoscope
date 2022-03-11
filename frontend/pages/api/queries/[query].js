import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { query } = req.query;
  console.log("I'm query", query)
  const query_meta = await db
    .collection("clean.posts.v2")
    .find({ $text: { $search: query } }).limit(20).toArray();
  // console.log(query_meta);
  res.json(query_meta);
};
