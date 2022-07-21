import { connectToDatabase } from "../../../util/mongodb";
import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  //const { db } = await connectToDatabase();
  const client = await clientPromise;
  const db = await client.db('aita');
  const notes = await db.collection("notes").find({}).toArray();
  res.json(notes);
};
