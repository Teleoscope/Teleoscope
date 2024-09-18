import { validateRequest } from '@/lib/auth';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const { workspace_id, label } = await request.json();

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const update_result = await db
            .collection<Workspaces>('workspaces')
            .updateOne(
                { _id: new ObjectId(workspace_id) },
                {
                    $set: {
                        label: label
                    }
                }
            );
            
        return update_result
    });

    return NextResponse.json(result);
}
