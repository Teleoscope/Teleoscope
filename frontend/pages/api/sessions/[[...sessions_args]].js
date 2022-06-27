import { connectToDatabase } from "../../../util/mongodb";
import { ObjectId } from 'bson';

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { session_args } = req.query;
  var ret;
  if(!session_args) {
    ret = await db.collection("sessions").find({}).limit(20).toArray();
  } else if (session_args.length === 1) {
    ret = await db.collection("sessions").findOne({_id: ObjectId(session_args[0])});
  } else if (session_args.length === 2) {
    // returns groups
    var groups = await db.collection("groups").find({}).toArray();
    var session = await db.collection("sessions").findOne({_id: ObjectId(session_args[0])});
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
  res.json(ret);
};
