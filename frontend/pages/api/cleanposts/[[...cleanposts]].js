import clientPromise from '../../../util/mongodb';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  
  const { cleanposts } = req.query;
  var queries = [];
  if (!cleanposts) {
    queries = await db.collection("clean.posts.v3").find({}).limit(20).toArray();
  } else if (cleanposts.length == 1) {
    queries = await db
    .collection("clean.posts.v3")
    .find({ $text: { $search: cleanposts[0] } }).limit(50).toArray();
  } else if (cleanposts.length == 2) {
    queries = await db
    .collection("clean.posts.v3")
    .find({ $text: { $search: cleanposts[0] } }).limit(parseInt(cleanposts[1])).toArray();
  }
  res.json(queries);
};
