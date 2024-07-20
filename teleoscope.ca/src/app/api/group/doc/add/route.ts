import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Groups } from '@/types/groups';
import { Graph } from '@/types/graph';
import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        document_id,
        group_id,
        workflow_id,
        workspace_id
    }: {
        document_id: string;
        group_id: string;
        workflow_id: string;
        workspace_id: string;
    } = req;

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const group = await db
            .collection<Graph>('graph')
            .findOne({ uid: group_id });
        const document = await db
            .collection<Graph>('graph')
            .findOne({ uid: document_id });


        return await db.collection<Groups>('groups').updateOne(
            { _id: new ObjectId(group?.reference) },
            {
                $push: {
                    docs: new ObjectId(document?.reference)
                }
            }
        );
    });

    

    send('update_nodes', {
        workflow_id: workflow_id,
        workspace_id: workspace_id,
        node_uids: [group_id]
    });
    return NextResponse.json(result);
}
