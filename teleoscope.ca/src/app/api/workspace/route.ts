import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    
    
    const { user } = await validateRequest();
    const workspace_id = request.nextUrl.searchParams.get('workspace');

    if (!workspace_id) {
        throw new Error(`Workspace ID missing for request: ${request.nextUrl}`)
    }

    const workspace = new ObjectId(workspace_id)

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const mongo_client = await client()
    const db = mongo_client.db()

    const result = await db
        .collection<Workspaces>('workspaces')
        .findOne({_id: workspace});

    mongo_client.close()

    return NextResponse.json(result);
}
