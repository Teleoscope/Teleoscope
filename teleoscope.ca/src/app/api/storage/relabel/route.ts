import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Storage } from '@/types/storage';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        workspace_id,
        storage_id,
        label
    }: { workspace_id: string; storage_id: string; label: string } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Storage>('storage')
            .updateOne(
                { _id: new ObjectId(storage_id) },
                { $set: { label: label} }
            );
    });
    return NextResponse.json(result);
}
