import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  //const { db } = await connectToDatabase();
  const client = await clientPromise;
  const db = await client.db('aita');
  const { note } = req.query;
  //const current = await db.collection("notes").findOne({postid: note});
  const current = await db.collection("groups").findOne({_id: ObjectId(note)})
  res.json(current);
};
