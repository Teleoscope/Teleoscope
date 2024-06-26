import { validateRequest } from "@/lib/auth";
import { client } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const mongo_client = await client()
    const db = mongo_client.db()
    
    const { user, session } = await validateRequest()

    if (!user) {
        mongo_client.close()
        return Response.json("No user signed in.");
    }

    const result = await db.collection("accounts").find({
        $or: [
            { "users.owner": user.id },
            {
                "users.admins": {
                    $elemMatch: {
                        "permission.write": true,
                        "_id": user.id
                    }
                }
            }
        ]
    }).toArray();
    
    mongo_client.close()
    return Response.json(result);
}
