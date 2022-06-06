import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { user } = req.query;
  const user_data = await db.collection("users").findOne({username: user});
  res.json(user_data);
};
