import { connectToDatabase } from "../../../util/mongodb";
const { ObjectId } = require("mongodb");

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { oid } = req.query;
  const id = new ObjectId(oid);
  const query_meta = await db
    .collection("docsets")
    .find(id);
  console.log(query_meta);
  res.json(query_meta);
};
