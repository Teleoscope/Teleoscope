import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { documentid } = req.query;
  const query_meta = await db.collection("documents").findOne({ id: documentid });
  res.json(query_meta);
};
