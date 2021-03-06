import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const teleoscopes = await db.collection("teleoscopes").find({}).toArray();
  res.json(teleoscopes);
};
