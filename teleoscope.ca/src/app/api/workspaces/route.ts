import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { Teams } from '@/types/teams';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Workflows } from '@/types/workflows';
import randomColor from 'randomcolor';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('workspaces')
            .find({
                $or: [
                    { owner: user },
                    {
                        users: {
                            $elemMatch: {
                                'permissions.read': true,
                                _id: user
                            }
                        }
                    }
                ]
            })
            .toArray();
    });

    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
    const mongo_client = await client();
    const db = mongo_client.db();
    const mongo_session = mongo_client.startSession();

    let transactionError: Error | null = null;

    try {
        await mongo_session.withTransaction(async () => {
            const data: { team: string; label: string } = await request.json();

            const { user } = await validateRequest();

            if (!user) {
                throw new Error('No user signed in.');
            }

            const team = new ObjectId(data['team']);
            const label = data['label'];

            const workspace: Workspaces = {
                label: label,
                team: team,
                settings: {
                    document_width: 100,
                    document_height: 100,
                    expanded: false
                },
                selected_workflow: "",
                workflows: [],
                storage: []
            };

            const workspace_result = await db
                .collection<Workspaces>('workspaces')
                .insertOne(workspace, { session: mongo_session });

            if (!workspace_result) {
                throw new Error('Error inserting workspace');
            }

            const workflow: Workflows = {
                last_update: new Date().toISOString(),
                logical_clock: 0,
                workspace: workspace_result.insertedId,
                label: 'Default workflow',
                nodes: [],
                edges: [],
                bookmarks: [],
                selection: {
                    nodes: [],
                    edges: []
                },
                settings: {
                    color: randomColor(),
                    title_length: 100
                }
            };
            const workflow_result = await db
                .collection<Workflows>('workflows')
                .insertOne(workflow);

            const team_result = await db.collection<Teams>('teams').updateOne(
                { _id: team },
                {
                    $push: {
                        workspaces: workspace_result.insertedId
                    }
                },
                { session: mongo_session }
            );

            if (team_result.matchedCount === 0) {
                throw new Error('Team update failed.');
            }

            const workspace_update_result = await db
                .collection<Workspaces>('workspaces')
                .updateOne(
                    { _id: workspace_result.insertedId },
                    {
                        $push: { workflows: workflow_result.insertedId },
                        $set: {
                            selected_workflow: workflow_result.insertedId
                        }
                    },
                    { session: mongo_session }
                );
        });
    } catch (error) {
        transactionError = error as Error;
        console.error(
            'Transaction error:',
            transactionError
                ? transactionError.message
                : 'Error during transaction.'
        );
    } finally {
        if (transactionError) {
            await mongo_session.abortTransaction();
        }
        await mongo_session.endSession();
    }

    if (transactionError) {
        return NextResponse.json({
            message: 'Error',
            error: transactionError.message
        });
    } else {
        return NextResponse.json({ message: 'Success' });
    }
}
