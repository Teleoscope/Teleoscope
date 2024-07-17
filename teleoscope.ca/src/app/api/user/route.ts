import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('users')
            .findOne({_id: user.id!})
    });

    return Response.json(result);
}
