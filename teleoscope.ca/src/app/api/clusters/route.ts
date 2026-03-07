export const dynamic = 'force-dynamic';
import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const cluster_id = request.nextUrl.searchParams.get('cluster');
    if (!cluster_id) {
        return NextResponse.json(
            { error: 'Cluster query parameter is required.' },
            { status: 400 }
        );
    }
    if (!ObjectId.isValid(cluster_id)) {
        return NextResponse.json(
            { error: 'Cluster id must be a valid ObjectId.' },
            { status: 400 }
        );
    }

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection('groups').findOne({
            _id: new ObjectId(cluster_id)
        });
    });

    return NextResponse.json(result);
}
