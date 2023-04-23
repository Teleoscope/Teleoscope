import clientPromise from '../../../util/mongodb';
import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const query = await db.collection("documents").find({}).project({ _id: 1, id: 1, text: 1, title: 1}).limit(20).toArray();
  res.json(query);
});
