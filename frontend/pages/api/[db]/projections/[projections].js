import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;
  var ret;
  var objid = new ObjectId(args);
  var projection;

  ret = await db
    .collection("projections")
    .findOne({ _id: objid }, { projection: { history: { $slice: 1 } } });

  // for clusters
  if (args.length === 2) {
    var clusters = await db
      .collection("clusters")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();
    projection = ret;
    var projClusters = projection?.history[0].clusters.map((cluster) => {
      return cluster.toString();
    });
    var filteredClusters = clusters.filter((cluster) => {
      var c = cluster._id.toString();
      if (projClusters?.includes(c)) {
        return true;
      } else {
        return false;
      }
    });

    ret = filteredClusters;
  } 

  res.json(ret);
};