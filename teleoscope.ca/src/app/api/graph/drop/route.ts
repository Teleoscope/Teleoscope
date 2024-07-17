import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Graph } from '@/types/graph';
import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { uid, type, workflow_id, workspace_id, parameters, reference } = req;
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const doc: Graph = {
            uid: uid,
            type: type,
            reference: new ObjectId(reference),
            workflow: new ObjectId(workflow_id),
            workspace: new ObjectId(workspace_id),
            status: 'Loading...',
            doclists: [],
            parameters: parameters,
            edges: {
                source: [],
                control: [],
                output: []
            }
        };
        const insert_result = await db
            .collection<Graph>('graph')
            .insertOne(doc);

        send('update_nodes', {
            workflow_id: workflow_id,
            workspace_id: workspace_id,
            nodes: [uid]
        });

        return insert_result;
    });
    return NextResponse.json(result);
}
