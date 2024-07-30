import { validateRequest } from "@/lib/auth";
import { dbOp } from "@/lib/db";
import { Db, MongoClient } from "mongodb";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest()

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection("accounts").findOne(
            {
                "users.owner": user?.id
            }
        ) 
    })

    return Response.json(result);
}
