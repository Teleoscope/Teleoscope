import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import send from '@/lib/amqp';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Graph } from '@/types/graph';

interface Change {
    source: string;
    target: string;
    type: string;
}

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const { changes, workspace_id, workflow_id } = await request.json();
    if (!Array.isArray(changes)) {
        throw new TypeError('Expected changes to be an array');
    }

    try {
        const result = await dbOp(async (client: MongoClient, db: Db) => {
            for (const change of changes) {
                const match_source = await db
                    .collection<Graph>('graph')
                    .updateOne(
                        { uid: change.source },
                        {
                            $push: {
                                [`edges.output`]: change.target
                            }
                        }
                    );

                const match_target = await db
                    .collection<Graph>('graph')
                    .updateOne(
                        { uid: change.target },
                        {
                            $push: {
                                [`edges.${change.type}`]: change.source
                            }
                        }
                    );
            }

            send('update_nodes', {
                workflow_id: workflow_id,
                workspace_id: workspace_id,
                nodes: changes.map((change: Change) => change.target)
            });
        });

        return NextResponse.json({
            message: `Sent ${changes.map(
                (change: Change) => change.target
            )} to queue for updating on edge add.`
        });
    } catch (error) {
        console.error('Error processing changes:', error);
        return NextResponse.json({
            message: 'Error processing changes',
            error: error.message
        });
    }
}
