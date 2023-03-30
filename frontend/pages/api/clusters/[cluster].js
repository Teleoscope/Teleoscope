import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const { cluster } = req.query;
  const current = await db.collection("clusters").findOne({_id: new ObjectId(cluster)});
  res.json(current);
};