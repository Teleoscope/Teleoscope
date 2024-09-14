import { validateRequest } from '@/lib/auth';
import { dbOp } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Documents } from '@/types/documents';
import { Db, MongoClient, ObjectId } from 'mongodb';
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const query = request.nextUrl.searchParams.get('query');
    const workspace = request.nextUrl.searchParams.get('workspace');
    const raw_limit = request.nextUrl.searchParams.get('limit');
    const raw_skip = request.nextUrl.searchParams.get('skip');

    const limit = raw_limit ? Math.max(parseInt(raw_limit), 10000) : 1000;
    const skip = raw_skip ? parseInt(raw_skip) : 0;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const q = query ? { $text: { $search: query }, workspace: new ObjectId(workspace!) } : {};

        return await db
            .collection<Documents>('documents')
            .find(q)
            .skip(skip)
            .limit(limit)
            .project({ _id: 1 })
            .toArray();
    });

    return NextResponse.json(result);
}
