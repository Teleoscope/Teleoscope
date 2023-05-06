import clientPromise from '@/util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;

  var count = 0;
  if (!args) {
    count = await db
    .collection("documents")
    .count({})
  } else if (args.length == 1) {
    count = await db
    .collection("documents")
    .count({ $text: { $search: args[0].replace("\"", "\\\"") } })
  } else if (args.length == 2) {
    count = await db
    .collection("documents")
    .count({ $text: { $search: args[0].replace("\"", "\\\"") } })
  }
  res.json(count);
};
