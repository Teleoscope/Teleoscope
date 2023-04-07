import clientPromise from '@/util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const query = await db.collection("documents").find({}).project({ _id: 1, id: 1, text: 1, title: 1}).limit(20).toArray();
  res.json(query);
};
