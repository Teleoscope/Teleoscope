import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

// export default async (req, res) => {
//   const client = await clientPromise;
//   const db = await client.db(req.query.db);
//   const { user } = req.query;
//   const user_data = await db.collection("users").findOne({ username: user });
//   res.json(user_data);
// };

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { args } = req.query;

  let ret;

  if (!args) {
    ret = await db.collection("users").findOne({ _id: args });
  } 
  
  else if (args.length === 1) {
    ret = await db.collection("users").findOne({ _id: new ObjectId(args[0]) });
  } 
  
  else if (args.length === 2 && args[0] === "sessions") {

    var sessions = await db
      .collection("sessions")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();

    var user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(args[1]) });

    var userSessions = user?.sessions.map((session) => {
      return session.toString();
    });

    var filteredSessions = sessions.filter((session) => {
      var s = session._id.toString();
      if (userSessions?.includes(s)) {
        return true;
      } else {
        return false;
      }
    });

    ret = filteredSessions;
  } 
  
  res.json(ret);
};
