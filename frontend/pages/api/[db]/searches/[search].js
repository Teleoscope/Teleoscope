import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = await client.db(req.query.db);
    
    const search = await db.collection("searches").findOne({
        _id: new ObjectId(req.query.search)
    }, { projection: { history: { $slice: 1 } } });

    res.json(search)
}