import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const { note } = req.query;
  const current = await db.collection("notes").findOne({oid: ObjectId(note)});
  res.json(current);
};
