import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;

  let i, j = 0
  let teleoscope;

  if (!args) {
    teleoscope = await db.collection("teleoscopes").find({}, { projection: {  history: { $slice: 1 } } }).toArray();
  } else if (args.length == 1) {
    teleoscope = await db.collection("teleoscopes").findOne({ _id: new ObjectId(args[0]) },
      { projection: {  history: { $slice: 1 } } }
    );
  } else if (args.length == 2) {
    teleoscope = await db.collection("teleoscopes").findOne({ _id: new ObjectId(args[0]) },
      { projection: { "history.rank_slice": { $slice: parseInt(args[1]) } } }
    );
  } else if (args.length == 3) {
    teleoscope = await db.collection("teleoscopes").findOne({ _id: new ObjectId(args[0]) },
      { projection: {  "history.rank_slice": { $slice: [parseInt(args[1]), parseInt(args[2])] } } }
    );
  }
  
  res.json(teleoscope);
};
