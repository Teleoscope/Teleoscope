import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { postid } = req.query;
  const query_meta = await db.collection("documents").findOne({ id: postid });
  res.json(query_meta);
};
