import { validateRequest } from '@/lib/auth';
import { Workflows } from '@/types/workflows';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Workspaces } from '@/types/workspaces';

export async function POST(request: NextRequest) {
    try {
        const { user } = await validateRequest();
        if (!user) {
            return NextResponse.json({ message: 'No user signed in.' });
        }

        const { workspace_id, workflow_id } = await request.json();

        if (!workspace_id || !workflow_id) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const result = await dbOp(async (client: MongoClient, db: Db) => {
            const session = client.startSession();
            try {
                session.startTransaction();

                const remove_result = await db
                    .collection<Workflows>('workflows')
                    .deleteOne({_id: new ObjectId(workflow_id)}, { session });
                const update_result = await db
                    .collection<Workspaces>('workspaces')
                    .updateOne(
                        { _id: new ObjectId(workspace_id) },
                        { $pull: { workflows: new ObjectId(workflow_id) } },
                        { session }
                    );

                await session.commitTransaction();
                return update_result;
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error processing POST request:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
