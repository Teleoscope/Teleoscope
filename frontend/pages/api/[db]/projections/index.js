import clientPromise from "@/util/mongodb";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const projections = await db.collection("projections").find({}).toArray();
  res.json(projections);
};
