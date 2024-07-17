import { validateRequest } from '@/lib/auth';
import { dbOp } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Documents } from "@/types/documents";
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const raw_query = request.nextUrl.searchParams.get('query')
    const query = raw_query ? raw_query : "";
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Documents>('documents')
            .find({ $text: {$search: query} }).project({_id:1}).toArray();
    });

    return NextResponse.json(result);
}
