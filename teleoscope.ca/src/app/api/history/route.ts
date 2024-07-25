import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function POST(request: NextRequest) {
    try {
        const { user } = await validateRequest();
        if (!user) {
            return NextResponse.json({ message: 'No user signed in.' });
        }

        const { history } = await request.json();


        const result = await dbOp(async (client: MongoClient, db: Db) => {
                const insert_result = await db
                    .collection<History>('history')
                    .insertOne({history: history, userid: user.id});
            
                return insert_result;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error processing POST request:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
