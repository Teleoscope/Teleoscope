import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(process.env.NEXT_PUBLIC_DATABASE);
  const { sessionsargs } = req.query;
  var ret;
  var objid;
  var session;

  if (sessionsargs?.length > 0) {
    if (sessionsargs[0] != "-1") {
      objid = ObjectId(sessionsargs[0])
    } else {
      objid = -1
    }
  }

  if(!sessionsargs) {
    ret = await db.collection("sessions").find({}, { projection: { history: {"$slice": 1 }}}).toArray();
  } 
  else if (sessionsargs.length === 1) {
    ret = await db.collection("sessions").findOne({_id: objid}, { projection: { history: {"$slice": 1 }}} );
  } 
  else if (sessionsargs.length === 2 && sessionsargs[1] === "groups") {
    // returns groups
    var groups = await db.collection("groups").find({},  { projection: { history: {"$slice": 1 }}}).toArray();
    session = await db.collection("sessions").findOne({_id: objid},  { projection: { history: {"$slice": 1 }}});
    var sessionGroups = session?.history[0].groups.map((group) => {
      return group.toString();
    });
    var filteredGroups = groups.filter((group) => {
      var g = group._id.toString();
      if (sessionGroups?.includes(g)) {
        return true;
      } else {
        return false;
      }
    })
    ret = filteredGroups;
  } 
  else if (sessionsargs.length === 2 && sessionsargs[1] === "clusters") {
    var clusters = await db.collection("clusters").find({},  { projection: { history: {"$slice": 1 }}}).toArray();
    session = await db.collection("sessions").findOne({_id: objid},  { projection: { history: {"$slice": 1 }}});
    var sessionClusters = session?.history[0].clusters.map((cluster) => {
      return cluster.toString();
    });
    var filteredClusters = clusters.filter((cluster) => {
      var c = cluster._id.toString();
      if (sessionClusters?.includes(c)) {
        return true;
      } else {
        return false;
      }
    })
    ret = filteredClusters;
  }
  else if (sessionsargs.length === 2 && sessionsargs[1] === "teleoscopes") {
    // returns teleoscopes
    var teleoscopes = await db.collection("teleoscopes").find({},  { projection: { history: {"$slice": 1 }}}).toArray();
    session = await db.collection("sessions").findOne({_id: objid},  { projection: { history: {"$slice": 1 }}});
    var session_teleoscopes = session?.history[0].teleoscopes.map((t_id) => {
      return t_id.toString();
    });
    var filtered_teleoscopes = teleoscopes.filter((teleoscope) => {
      var t = teleoscope._id.toString();
      if (session_teleoscopes?.includes(t)) {
        return true;
      } else {
        return false;
      }
    })
    ret = filtered_teleoscopes;
  }

  // returns groups or list of session objects dependending on the conditionals
  res.json(ret);
};
