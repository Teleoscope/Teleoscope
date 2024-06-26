import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { Workflows } from '@/types/workflows';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    
    const { user } = await validateRequest();
    const workflow_id = request.nextUrl.searchParams.get('workflow');

    if (!workflow_id) {
        throw new Error(`Workflow ID missing for request: ${request.nextUrl}`)
    }

    const workflow = new ObjectId(workflow_id)

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const mongo_client = await client()
    const db = mongo_client.db()

    const result = await db
        .collection<Workflows>('workflows')
        .findOne({_id: workflow});

    mongo_client.close()

    return NextResponse.json(result);
}
