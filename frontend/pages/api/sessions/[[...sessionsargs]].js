import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
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
        return false;}
    })
    ret = filteredGroups;
  }
  // returns groups or list of session objects dependending on the conditionals
  res.json(ret);
};
