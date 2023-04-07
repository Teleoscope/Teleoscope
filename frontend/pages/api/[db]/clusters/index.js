import clientPromise from '@/util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const clusters = await db.collection("clusters").find({}).toArray();
  res.json(clusters);
};
