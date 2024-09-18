import { validateRequest } from '@/lib/auth';
import { Documents } from '@/types/documents';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const query = request.nextUrl.searchParams.get('query');
    const workspace = request.nextUrl.searchParams.get('workspace');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const q = query ? { $text: { $search: query }, workspace: new ObjectId(workspace!) } : {workspace: new ObjectId(workspace!)}
        return await db
            .collection<Documents>('documents')
            .countDocuments(q)
    });

    return NextResponse.json(result);
}



