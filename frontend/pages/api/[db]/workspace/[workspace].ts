import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async function handler(req, res) {
    const client = await clientPromise;
    const users_db = await client.db("users");
    
    const workspace = await users_db.collection("workspaces").findOne({
        _id: new ObjectId(req.query.workspace)
    });
    const workflows = workspace?.workflows.map(wf => new ObjectId(wf))

    

    if (workspace) {
        const db = await client.db(req.query.db);
        const sessions = await db.collection("sessions").find({
            _id: { "$in": workflows }
        }).toArray()
        
        res.json(sessions)
    }

    res.status(401)
    

}