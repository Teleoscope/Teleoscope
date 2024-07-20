import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Graph } from '@/types/graph';
import send from '@/lib/amqp';
import { Edge } from 'reactflow';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    let edges, workspace_id, workflow_id;

    try {
        const body = await request.json();
        edges = body.edges;
        workspace_id = body.workspace_id;
        workflow_id = body.workflow_id;

        if (!edges) {
            throw new Error('No edges provided.');
        }
    } catch (error) {
        console.error('Error parsing request body:', error);
        return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }

    try {
        const target_uids = edges.map((edge: Edge) => edge.target);
        const source_uids = edges.map((edge: Edge) => edge.source);

        const uids = target_uids.concat(source_uids);

        const result = await dbOp(async (client: MongoClient, db: Db) => {
            const match_nodes = await db
                .collection<Graph>('graph')
                .find(
                    {
                        $or: [
                            { 'edges.source': { $elemMatch: { $in: uids } } },
                            { 'edges.control': { $elemMatch: { $in: uids } } },
                            { 'edges.output': { $elemMatch: { $in: uids } } }
                        ]
                    },
                    { projection: { uid: 1 } }
                )
                .toArray();

            const match_target_nodes_only = await db
                .collection<Graph>('graph')
                .find(
                    {
                        $or: [
                            { 'edges.source': { $elemMatch: { $in: uids } } },
                            { 'edges.control': { $elemMatch: { $in: uids } } },
                            // { 'edges.output': { $elemMatch: { $eq: uids } } }
                        ]
                    },
                    { projection: { uid: 1 } }
                )
                .toArray();



            const graph_update_target_node_uids = match_target_nodes_only.map((doc) => doc.uid);

            const node_uids = match_nodes.map((doc) => doc.uid);

            // Perform the update operation
            const delete_result = await db.collection<Graph>('graph').updateMany(
                {
                    uid: { $in: node_uids } // Use the IDs obtained to match documents
                },
                {
                    $pull: {
                        'edges.source': { $in: uids },
                        'edges.control': { $in: uids },
                        'edges.output': { $in: uids }
                    }
                }
            );

            send("update_nodes", {
                workflow_id: workflow_id,
                workspace_id: workspace_id,
                node_uids: graph_update_target_node_uids
            });

            return delete_result;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error processing the request:', error);
        return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
    }
}
