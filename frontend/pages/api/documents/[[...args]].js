import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  
  const { args } = req.query;
  var queries = [];
  if (!args) {
    queries = await db.collection("documents").find({}).limit(500).toArray();
  } else if (args.length == 1) {
    queries = await db
    .collection("documents")
    .find({ $text: { $search: args[0] } }).limit(500).toArray();
  } else if (args.length == 2) {
    queries = await db
    .collection("documents")
    .find({ $text: { $search: args[0] } }).limit(parseInt(args[1])).toArray();
  }
  res.json(queries);
};
