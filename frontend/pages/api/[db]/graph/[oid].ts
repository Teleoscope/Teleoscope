import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
    const client = await clientPromise;
    const db = await client.db(req.query.db);
    const { oid } = req.query;

    const node = await db
      .collection("graph")
      .findOne(new ObjectId(oid))
      
    if (node) {
        res.json(node);
    } else {
        res.status(401)
    }

};
