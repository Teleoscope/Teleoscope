import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Files } from '@/types/files';


export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { workspace_id, filename } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection<Files>("files").deleteOne({"filename": filename, workspace: new ObjectId(workspace_id)})
    });
    return NextResponse.json(result);
}
