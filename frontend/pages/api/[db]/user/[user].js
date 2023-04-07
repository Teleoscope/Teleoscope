import clientPromise from '@/util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { user } = req.query;
  const user_data = await db.collection("users").findOne({username: user});
  res.json(user_data);
};
