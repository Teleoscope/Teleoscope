import { validateRequest } from '@/lib/auth';
import { Workflows } from '@/types/workflows';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    const workflow_ids = request.nextUrl.searchParams.get('workflows');

    if (!workflow_ids) {
        // throw new Error(`Workflow IDs missing for request: ${request.nextUrl}`);
        return NextResponse.json([]);
    }

    if (workflow_ids.includes("undefined")) {
        // throw new Error(`Workflow IDs missing for request: ${request.nextUrl}`);
        return NextResponse.json([]);
    }

    const workflows = workflow_ids.split(",").map(id => new ObjectId(id));

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Workflows>('workflows')
            .find({ _id: { $in: workflows } }).toArray();

    });

    return NextResponse.json(result);
}

