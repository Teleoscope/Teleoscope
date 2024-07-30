import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Graph } from '@/types/graph';
import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { uid, parameters, workflow_id, workspace_id } = req;
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const setObject: any = {};

        for (const [key, value] of Object.entries(parameters)) {
            const param: string = `parameters.${key}`;
            setObject[param] = value;
        }

        const update_result = await db
            .collection<Graph>('graph')
            .updateOne({uid: uid}, {
                $set: setObject
            });

        send('update_nodes', {
            workflow_id: workflow_id,
            workspace_id: workspace_id,
            node_uids: [uid]
        });

        return update_result;
    });
    return NextResponse.json(result);
}
