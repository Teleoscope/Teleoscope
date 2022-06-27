import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { sessionsargs } = req.query;
  var ret;

  console.log("This is the session argument", sessionsargs)
  if(!sessionsargs) {
    ret = await db.collection("sessions").find({}).limit(20).toArray();
  } else if (sessionsargs.length === 1) {
    ret = await db.collection("sessions").findOne({_id: ObjectId(sessionsargs[0])});
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "groups") {
    // returns groups
    var groups = await db.collection("groups").find({}).toArray();
    var session = await db.collection("sessions").findOne({_id: ObjectId(sessionsargs[0])});
    var lastItem = session.history[session.history.length - 1];
    var sessionGroups = lastItem.groups;
    var filteredGroups = groups.filter((group) => {
      if (sessionGroups.findIndex(group._id) > -1) {
        return true;
      } else {return false;}
    })
    ret = filteredGroups;
  }
  // returns groups or list of session objects dependending on the conditionals
  console.log("This is the session argument2", sessionsargs)
  res.json(ret);
};
