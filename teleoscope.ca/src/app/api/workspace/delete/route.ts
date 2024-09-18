import { validateRequest } from '@/lib/auth';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Teams } from '@/types/teams';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const { workspace_id, workflow_id } = await request.json();

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const session = client.startSession();
        try {
            const id = new ObjectId(workspace_id);
            
            session.startTransaction();

            const workspace = await db
                .collection<Workspaces>('workspaces')
                .findOne({ _id: id }, { session });

            // TODO: const storage_items = workspace?.storage;
            // send('delete_storage', {
            //     database: MONGODB_DATABASE,
            //     userid: user.id,
            //     workspace: workspace_id,
            //     storage: storage_id,
            // });

            const update_result = await db
                .collection<Teams>('teams')
                .updateOne(
                    { workspaces: id },
                    { $pull: { workspaces: id } },
                    { session }
                );

            const delete_result = await db
                .collection<Workspaces>('workspaces')
                .deleteOne({ _id: id }, { session });

            
            await session.commitTransaction();
            return [update_result, delete_result];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    });

    return NextResponse.json(result);
}
