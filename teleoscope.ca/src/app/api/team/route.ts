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
    const team_oid = request.nextUrl.searchParams.get('team');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('teams')
            .findOne({_id: new ObjectId(team_oid!)})
    });

    return Response.json(result);
}
