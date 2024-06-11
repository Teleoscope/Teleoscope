import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { Teams } from '@/types/teams';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const db = (await client()).db();
    const { user } = await validateRequest();

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const result = await db
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

    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
    const mongo_client = await client();
    const db = mongo_client.db();
    const mongo_session = mongo_client.startSession();

    let transactionError: Error | null = null;

    try {
        await mongo_session.withTransaction(async () => {
            const data: { team: string, label: string } = await request.json();

            const { user } = await validateRequest();

            if (!user) {
                throw new Error('No user signed in.');
            }

            const team = new ObjectId(data["team"]);
            const label = data["label"];

            const workspace: Workspaces = {
                label: label,
                team: team
            };

            console.log("workspace", workspace);

            const workspace_result = await db
                .collection<Workspaces>('workspaces')
                .insertOne(workspace, { session: mongo_session });

            if (!workspace_result.acknowledged) {
                throw new Error('Error inserting workspace');
            }

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
                throw new Error("Team update failed.");
            }
        });
    } catch (error) {
        transactionError = (error as Error);
        console.error('Transaction error:', transactionError ? transactionError.message : "Error during transaction.");
    } finally {
        if (transactionError) {
            await mongo_session.abortTransaction();
        }
        await mongo_session.endSession();
        await mongo_client.close();
    }

    if (transactionError) {
        return NextResponse.json({ message: 'Error', error: transactionError.message });
    } else {
        return NextResponse.json({ message: 'Success' });
    }
}
