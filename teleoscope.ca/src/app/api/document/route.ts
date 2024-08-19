import { validateRequest } from '@/lib/auth';
import { Documents } from '@/types/documents';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const document = request.nextUrl.searchParams.get('document');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Documents>('documents')
            .findOne({ _id: new ObjectId(document!) })
    });

    return NextResponse.json(result);
}
