import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    try {
        const req = await request.json();
        const { workspace_id, storage_id } = req;

        const result = await dbOp(async (client: MongoClient, db: Db) => {
            const storageObjectId = new ObjectId(storage_id);

            const storage_delete_result = await db
                .collection('storage')
                .deleteOne({ _id: storageObjectId });

            const workspace_delete_result = await db
                .collection('workspaces')
                .updateOne(
                    { _id: new ObjectId(workspace_id) },
                    {
                        $pull: {
                            storage: {
                                $in: [storage_id, storageObjectId]
                            }
                        }
                    }
                );

            return { storage_delete_result, workspace_delete_result };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error during POST operation:', error);
        return NextResponse.json({ message: 'Error processing request.', error: error.message }, { status: 500 });
    }
}
