import clientPromise from "@/util/mongodb";
import { ObjectId } from "bson";

export default async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db(req.query.db); // Removed redundant await
    const { documentid } = req.query;

    // Determine the query based on the length of the documentid
    const isObjectId = documentid.length > 6;
    const queryCondition = isObjectId
      ? { _id: new ObjectId(documentid) }
      : { id: documentid };

    // Projection object to avoid repetition
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
};
