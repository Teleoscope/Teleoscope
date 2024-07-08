import { validateRequest } from '@/lib/auth';
import { Notes } from '@/types/notes';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Db, MongoClient } from 'mongodb';
import { dbOp } from '@/lib/db';
import { Workspaces } from '@/types/workspaces';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    const workspace_id = request.nextUrl.searchParams.get('workspace');

    if (!workspace_id) {
        throw new Error(`Workflow ID missing for request: ${request.nextUrl}`);
    }

    const workspace = new ObjectId(workspace_id);

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const workspace_result = await db
            .collection<Workspaces>('workspaces')
            .findOne({ _id: workspace });

        if (!workspace_result) {
            throw new Error(
                `Workspace failed to load for request: ${request.nextUrl}`
            );
        }

        const note_result = await db
            .collection<Notes>('notes')
            .find({ _id: { $in: [workspace_result.notes] } }).toArray();

        if (!note_result) {
            throw new Error(
                `Notes failed to load for request: ${request.nextUrl}`
            );
        }

        return note_result
    });

    return NextResponse.json(result);
}
