export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    return Response.json({hello: "world"});
}