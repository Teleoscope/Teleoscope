import clientPromise from '../../../util/mongodb';
import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const teleoscopes = await db.collection("teleoscopes").find({}).toArray();
  res.json(teleoscopes);
});
