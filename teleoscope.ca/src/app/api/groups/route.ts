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
    const ids = request.nextUrl.searchParams.has('ids')
        ? request.nextUrl.searchParams.get('ids') === 'true'
        : false;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        if (ids) {
            const groups = await db
                .collection('groups')
                .find({ workspace: new ObjectId(workspace!) })
                .project({ _id: true })
                .toArray();
            return groups.map(g => g._id)
        } else {
            return await db
                .collection('groups')
                .find({ workspace: new ObjectId(workspace!) })
                .toArray();
        }
    });

    return Response.json(result);
}
