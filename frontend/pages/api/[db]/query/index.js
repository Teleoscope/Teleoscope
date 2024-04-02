import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db(req.query.db); // Removed redundant await
    let { q, index } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Missing query or index" });
    }

    if (!index || index === "_id") {
      index = "_id";
      const isObjectId = q.length > 6;
      q = isObjectId ? new ObjectId(q) : q;
    }


    db.collection("documents").indexExists(index, (err, result) => {
      if (err) {
        console.error("Failed to check index:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!result) {
        return res.status(400).json({ error: "Invalid index - index does not exist" });
      }
    });

    const queryCondition = { [index]: q };
    const projection = {
      _id: 1, id: 1, text: 1, title: 1, metadata: 1, state: 1,
    };

    // Execute the query
    const document = await db.collection("documents").findOne(queryCondition, { projection });

    res.json(document || { error: "Document not found" });
  } catch (error) {
    console.error("Failed to fetch document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}