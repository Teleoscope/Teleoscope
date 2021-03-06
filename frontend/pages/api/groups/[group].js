import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { group } = req.query;
  const current = await db.collection("groups").findOne({_id: ObjectId(group)});
  res.json(current);
};