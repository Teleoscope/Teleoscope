import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const posts = await db.collection("clean.posts.v3").find({}).limit(20).toArray();
  res.json(posts);
};
