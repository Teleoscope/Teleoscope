import { validateRequest } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const workspace = request.nextUrl.searchParams.get('workspace');
    const workspaceId =
        workspace && ObjectId.isValid(workspace)
            ? new ObjectId(workspace)
            : workspace;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('notes')
            .find({ $or: [{ workspace: workspaceId }, { workspace }] })
            .toArray();
    });

    return Response.json(result);
}
