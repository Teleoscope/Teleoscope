import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const users = await db.collection("users").find({}).limit(20).toArray();
  res.json(users);
};
