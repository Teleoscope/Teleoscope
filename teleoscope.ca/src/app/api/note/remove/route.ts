import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';


export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { note } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection("notes").deleteOne({_id: new ObjectId(note)})
    });
    return NextResponse.json(result);
}
