import clientPromise from '@/util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { user } = req.query;
  if (user == "-1") {
    return res.json("userid is -1");
  }
  const user_data = await db.collection("users").findOne({_id: new ObjectId(user)});
  res.json(user_data);
};
