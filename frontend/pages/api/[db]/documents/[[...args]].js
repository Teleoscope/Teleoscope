import clientPromise from "@/util/mongodb";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);

  const { args } = req.query;
  var queries = [];
  if (!args) {
    queries = await db
      .collection("documents")
      .find({})
      .project({ _id: 1, id: 1, text: 1, title: 1 })
      .limit(500)
      .toArray();
  } else if (args.length == 1) {
    queries = await db
      .collection("documents")
      .find({ $text: { $search: args[0] } })
      .project({ _id: 1, id: 1, text: 1, title: 1 })
      .limit(500)
      .toArray();
  } else if (args.length == 2) {
    queries = await db
      .collection("documents")
      .find({ $text: { $search: args[0] } })
      .project({ _id: 1, id: 1, text: 1, title: 1 })
      .limit(parseInt(args[1]))
      .toArray();
  }
  res.json(queries);
};
