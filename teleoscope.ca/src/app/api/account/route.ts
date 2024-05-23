import { client } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const db = (await client()).db()

    const result = await db.collection("accounts").findOne(
        {
            "users.owner": request.nextUrl.searchParams.get("owner")
        }
    ) 
    return Response.json(result);
}
