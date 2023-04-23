import clientPromise from '../../../util/mongodb';
import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const notes = await db.collection("notes").find({}).toArray();
  res.json(notes);
});
