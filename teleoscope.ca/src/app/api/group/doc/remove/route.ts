export const dynamic = 'force-dynamic';
import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Groups } from '@/types/groups';
import { Graph } from '@/types/graph';
import send from '@/lib/amqp';
import { resolveDemoCorpusWorkspaceId } from '@/lib/demoMode';

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
    const effectiveWorkspaceId = resolveDemoCorpusWorkspaceId(workspace_id);

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const groupGraph = await db.collection<Graph>('graph').findOne({
            uid: group_id
        });
        const documentGraph = await db.collection<Graph>('graph').findOne({
            uid: document_id
        });
        const groupOid = groupGraph?.reference ?? new ObjectId(group_id);
        const documentOid = documentGraph?.reference ?? new ObjectId(document_id);

        const group_uids = await db.collection<Graph>('graph').find({
            reference: new ObjectId(groupOid)
        }).toArray();
        
        const pull_result =  await db.collection<Groups>('groups').updateOne(
            { _id: new ObjectId(groupOid) },
            {
                $pull: {
                    docs: new ObjectId(documentOid)
                }
            }
        );

        send('update_nodes', {
            workflow_id: workflow_id,
            workspace_id: effectiveWorkspaceId,
            node_uids: group_uids.map(g => g.uid)
        });
        
        return pull_result
    });

    
    return NextResponse.json(result);
}
