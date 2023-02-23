import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('teleoscope');
  const { documentid } = req.query;
  let query;
  if (documentid.length > 6) {
    query = await db.collection("documents").findOne({ _id: ObjectId(documentid) }, { projection: { _id: 1, id: 1, text: 1, title: 1}});
  } else {
    query = await db.collection("documents").findOne({ id: documentid }, { projection: { _id: 1, id: 1, text: 1, title: 1}});
  }
  res.json(query);
};
