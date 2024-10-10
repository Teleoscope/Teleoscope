import { validateRequest } from '@/lib/auth';
import { Files } from '@/types/files';
import { NextResponse } from 'next/server';
import { Db, MongoClient } from 'mongodb';
import { dbOp } from '@/lib/db';

export async function GET(request: Request) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    if (!filename) {
        return NextResponse.json(
            { error: 'Filename query parameter is missing' },
            { status: 400 }
        );
    }
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Files>('files')
            .findOne({ filename: filename });
    });

    return NextResponse.json(result);
}
