import { client } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const db = (await client()).db()
    const user = request.nextUrl.searchParams.get("user")!;

    const result = await db.collection("accounts").find({
        $or: [
            { "users.owner": user },
            {
                "users.admins": {
                    $elemMatch: {
                        "permission.write": true,
                        "_id": user
                    }
                }
            }
        ]
    }).toArray();

    return Response.json(result);
}
