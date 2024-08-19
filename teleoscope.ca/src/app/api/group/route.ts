import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Groups } from '@/types/groups';
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const group = request.nextUrl.searchParams.get('group');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Groups>('groups')
            .findOne({ _id: new ObjectId(group!) })
    });

    return NextResponse.json(result);
}
