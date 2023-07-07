import clientPromise from "@/util/mongodb";

export default async (req, res) => {
  const client = await clientPromise;
  
  const db = await client.db("users");
  const { username } = req.query;
  
  const user = await db
    .collection("users")
    .findOne({ username: username });

  if (user) {
    res.json(true);
  } else {
    res.json(false);
  }
};