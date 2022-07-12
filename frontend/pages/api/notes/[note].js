import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { note } = req.query;
  const current = await db.collection("notes").findOne({postid: note});
  res.json(current);
};
