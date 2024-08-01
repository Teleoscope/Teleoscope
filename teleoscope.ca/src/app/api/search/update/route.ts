import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Search } from '@/types/search';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        workspace_id,
        search_id,
        query
    }: { workspace_id: string; search_id: string; query: string } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Search>('searches')
            .updateOne(
                { _id: new ObjectId(search_id) },
                { $set: { query: query} }
            );
    });
    return NextResponse.json(result);
}
