import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    console.log("Hello, world!")
    return Response.json({hello: "world"});
}