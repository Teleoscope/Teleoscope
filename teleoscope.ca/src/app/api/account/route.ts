import { validateRequest } from "@/lib/auth";
import { client } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const mongo_client = await client()
    const db = mongo_client.db()
    
    const { user, session } = await validateRequest()


    const result = await db.collection("accounts").findOne(
        {
            "users.owner": user?.id
        }
    ) 

    mongo_client.close()
    return Response.json(result);
}
