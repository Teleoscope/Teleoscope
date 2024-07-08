import { NextRequest } from "next/server";
// import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    
    try {
        const req = await request.json()
        // const response = await send(req, req)
        // return Response.json(response);
    } catch (e) {
        console.log(e)
    }
    

    return Response.json({"error": "error"});
}