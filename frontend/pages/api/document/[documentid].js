import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const { documentid } = req.query;
  let query;
  if (documentid.length > 6) {
    query = await db.collection("documents").findOne({ _id: new ObjectId(documentid) }, { projection: { _id: 1, id: 1, text: 1, title: 1, metadata: 1, relationships: 1}});
  } else {
    query = await db.collection("documents").findOne({ id: documentid }, { projection: { _id: 1, id: 1, text: 1, title: 1, metadata: 1, relationships: 1}});
  }
  res.json(query);
};
