import { validateRequest } from '@/lib/auth';
import { Workflows } from '@/types/workflows';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const workflow_id = request.nextUrl.searchParams.get('workflow');
    if (!workflow_id) {
        throw new Error(`Workflow ID missing for request: ${request.nextUrl}`);
    }
    const workflow = new ObjectId(workflow_id);    

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Workflows>('workflows')
            .findOne({ _id: workflow });
    });

    return NextResponse.json(result);
}



export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const { _id, workspace, ...workflow } = await request.json()

    const update = {
        ...workflow
    }
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Workflows>('workflows')
            .updateOne({ _id: new ObjectId(_id) }, {
                $set: {
                    ...update
                }
            });
    });
    return NextResponse.json(result);
}

// export async function POST = (request: NextRequest) => validate() => post()