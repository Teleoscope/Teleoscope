import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const notes = await db.collection("notes").find({}).toArray();
  res.json(notes);
};
