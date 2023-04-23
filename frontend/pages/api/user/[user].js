import clientPromise from '../../../util/mongodb';
import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const { user } = req.query;
  const user_data = await db.collection("users").findOne({username: user});
  res.json(user_data);
});
