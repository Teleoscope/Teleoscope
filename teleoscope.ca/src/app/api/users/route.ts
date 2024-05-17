import { client } from "@/lib/db";
import { NextRequest } from "next/server";



export async function GET(request: NextRequest) {
    const db = (await client()).db()

    const result = await db.collection("users").findOne(
        {
            emails: [request.nextUrl.searchParams.get("email")]
        }
    )

    const exists = result ? true : false
  
    return Response.json({exists: exists});
}
