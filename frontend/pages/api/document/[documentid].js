import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { documentid } = req.query;
  const query = await db.collection("documents").find({ id: documentid }).project({ _id: 1, id: 1, text: 1, title: 1}).toArray();
  res.json(query[0]);
};
