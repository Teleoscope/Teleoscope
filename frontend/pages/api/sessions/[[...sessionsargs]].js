import clientPromise from '../../../util/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db('aita');
  const { sessionsargs } = req.query;
  var ret;

  if(!sessionsargs) {
    ret = await db.collection("sessions").find({}).toArray();
  } else if (sessionsargs.length === 1) {
    ret = await db.collection("sessions").findOne({_id: ObjectId(sessionsargs[0])});
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "groups") {
    // returns groups
    var groups = await db.collection("groups").find({}).toArray();
    var session = await db.collection("sessions").findOne({_id: ObjectId(sessionsargs[0])});
    var lastItem = session.history[session.history.length - 1];
    var sessionGroups = lastItem.groups.map((group) => {
      return group.toString();
    });
    var filteredGroups = groups.filter((group) => {
      var g = group._id.toString();
      if (sessionGroups.includes(g)) {
        return true;
      } else {
        return false;
      }
    })
    ret = filteredGroups;
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "teleoscopes") {
    // returns teleoscopes
    var teleoscopes = await db.collection("teleoscopes").find({}).toArray();
    var session = await db.collection("sessions").findOne({_id: ObjectId(sessionsargs[0])});
    var session_teleoscopes = session.teleoscopes.map((t_id) => {
      return t_id.toString();
    });
    var filtered_teleoscopes = teleoscopes.filter((teleoscope) => {
      var t = teleoscope._id.toString();
      if (session_teleoscopes.includes(t)) {
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
