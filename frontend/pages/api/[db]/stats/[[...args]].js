import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;

  var stat;

  const coll = (c) => db.collection(c).findOne({"_id": new ObjectId(args[1])}, { projection: { history: { $slice: 1 } } })

  if (!args) {
    stat = await db.collection("documents").count({ "state.read" : true});
  } else {
    switch(args[0]) {
      case "read":
        stat = await db.collection("documents").count({ "state.read" : true});
        break;
      case "unread":
        stat = await db.collection("documents").count({ "state.read" : false});
        break;
      case "group":
        const group = await coll("groups")
        var filter = {
          "_id": { "$in": group.history[0].included_documents.map(id => new ObjectId(id)) },
          "state.read": args[2] === "unread" ? false : true,
        }
        stat = await db.collection("documents").count(filter);
        break;
      case "teleoscope":
        const teleoscope = await coll("teleoscopes")
        var filter = {
          "_id": { "$in": teleoscope.history[0].rank_slice.map(([id, score]) => new ObjectId(id)) },
          "state.read": args[2] === "unread" ? false : true,
        }
        stat = await db.collection("documents").count(filter);
        break;
      case "search":
        if (args[1]) { 
          stat = await db
              .collection("documents")
              .count({ $text: { $search: args[1].replace('"', '\\"') },  "state.read": true });
        } else {
          stat = await db.collection("documents").count({"state.read": true});
        }
    }
  }

  res.json(stat);
};
