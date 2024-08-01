import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Documents } from '@/types/documents';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        workspace_id,
        read,
        document
    }: { workspace_id: string; read: boolean; document: string } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Documents>('documents')
            .updateOne(
                { _id: new ObjectId(document) },
                { $set: { state: { read: read } } }
            );
    });
    return NextResponse.json(result);
}
