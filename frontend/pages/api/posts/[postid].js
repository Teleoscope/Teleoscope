import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { postid } = req.query;
  const query_meta = await db.collection("posts").findOne({ id: postid });
  res.json(query_meta);
};
