import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { query } = req.query;
  const query_meta = await db
    .collection("queries")
    .findOne({ $text: { $search: query } });
  // console.log(query_meta);
  res.json(query_meta);
};
