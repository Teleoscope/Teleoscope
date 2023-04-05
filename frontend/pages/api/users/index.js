import clientPromise from '../../../util/mongodb';

import authDecorator from '../../../middlewares/authDecorator';

export default authDecorator(async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const users = await db.collection("users").find({}).toArray();
  res.json(users);
});
