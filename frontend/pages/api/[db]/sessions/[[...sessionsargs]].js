import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  const client = await clientPromise;
  const db = await client.db(req.query.db);
  const { sessionsargs } = req.query;
  var ret;
  var session_id;
  var session;

  if (sessionsargs?.length > 0 && sessionsargs[0] != "users") {
    if (sessionsargs[0] != "-1") {
      session_id = new ObjectId(sessionsargs[0]);
    } else {
      session_id = -1;
    }
  }

  if (!sessionsargs) {
    ret = await db
      .collection("sessions")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();
  } else if (sessionsargs.length === 1) {
    ret = await db
      .collection("sessions")
      .findOne({ _id: session_id }, { projection: { history: { $slice: 1 } } });
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "groups") {
    // returns groups
    var groups = await db
      .collection("groups")
      .find({ sessions: session_id }, { projection: { history: { $slice: 1 } } })
      .toArray();
    ret = groups;
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "clusters") {
    var clusters = await db
      .collection("clusters")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();
    session = await db
      .collection("sessions")
      .findOne({ _id: session_id }, { projection: { history: { $slice: 1 } } });
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
    });
    ret = filteredClusters;
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "teleoscopes") {
    // returns teleoscopes
    var teleoscopes = await db
      .collection("teleoscopes")
      .find({ sessions: session_id }, { projection: { history: { $slice: 1 } } })
      .toArray();
    ret = teleoscopes;
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "projections") {
    // returns projections
    var projections = await db
      .collection("projections")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();
    session = await db
      .collection("sessions")
      .findOne({ _id: session_id }, { projection: { history: { $slice: 1 } } });
    var session_projections = session?.history[0].projections?.map((p_id) => {
      return p_id.toString();
    });
    var filtered_projections = projections.filter((proj) => {
      var p = proj._id.toString();
      if (session_projections?.includes(p)) {
        return true;
      } else {
        return false;
      }
    });
    ret = filtered_projections;
  } else if (sessionsargs.length === 2 && sessionsargs[1] === "notes") {
    // returns notes
    var notes = await db
      .collection("notes")
      .find({}, { projection: { history: { $slice: 1 } } })
      .toArray();
    session = await db
      .collection("sessions")
      .findOne({ _id: session_id }, { projection: { history: { $slice: 1 } } });
    var session_notes = session?.history[0].notes.map((note_id) => {
      return note_id.toString();
    });
    var filtered_notes = notes.filter((note) => {
      var n = note._id.toString();
      if (session_notes?.includes(n)) {
        return true;
      } else {
        return false;
      }
    });
    ret = filtered_notes;
  } else if (sessionsargs.length === 2 && sessionsargs[0] === "users") {
    // returns sessions for user
    const userid = new ObjectId(sessionsargs[1]);
    const filter = {
      $or: [{ "userlist.owner": userid }, { "userlist.contributors": userid }],
    };
    var sessions = await db
      .collection("sessions")
      .find(filter, { projection: { history: { $slice: 1 } } })
      .toArray();
    ret = sessions;
  }

  // returns groups or list of session objects dependending on the conditionals
  res.json(ret);
};
