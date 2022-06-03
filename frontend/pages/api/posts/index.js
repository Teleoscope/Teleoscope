import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const posts = await db.collection("clean.posts.v3").find({}).limit(20).toArray();
  res.json(posts);
};
