import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { user } = req.query;
  const user_data = await db.collection("users").findOne({_id: ObjectId(user)});
  res.json(user_data);
};
