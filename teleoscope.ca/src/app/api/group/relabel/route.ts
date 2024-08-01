import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Groups } from '@/types/groups';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        workspace_id,
        group_id,
        label
    }: { workspace_id: string; group_id: string; label: string } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Groups>('groups')
            .updateOne(
                { _id: new ObjectId(group_id) },
                { $set: { label: label} }
            );
    });
    return NextResponse.json(result);
}
