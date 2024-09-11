import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import send from '@/lib/amqp';

const MONGODB_DATABASE = process.env.MONGODB_DATABASE!

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

                send('delete_storage', {
                    database: MONGODB_DATABASE,
                    userid: user.id,
                    workspace: workspace_id,
                    storage: storage_id,
                });

            return { workspace_delete_result };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error during POST operation:', error);
        return NextResponse.json({ message: 'Error processing request.', error: error.message }, { status: 500 });
    }
}
