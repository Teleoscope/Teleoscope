import clientPromise from "@/util/mongodb";
import { makeQuery } from "@/util/emoji";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;

  var count = 0;
  if (!args) {
    count = await db.collection("documents").estimatedDocumentCount({});
  } else if (args.length == 1) {
    count = await db
      .collection("documents")
      .countDocuments(makeQuery(args[0]));
  } else if (args.length == 2) {
    count = await db
      .collection("documents")
      .countDocuments(makeQuery(args[0]));
  }
  res.json(count);
};
