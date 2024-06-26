import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { AppState } from '@/services/app';
import { Workflows } from '@/types/workflows';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    const workspace_id = request.nextUrl.searchParams.get('workspace');

    if (!workspace_id) {
        throw new Error(`Workspace ID missing for request: ${request.nextUrl}`);
    }

    const workspace = new ObjectId(workspace_id);

    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const mongo_client = await client();
    const db = mongo_client.db();

    const workspace_result = await db
        .collection<Workspaces>('workspaces')
        .findOne({ _id: workspace });
    
    if (!workspace_result || !workspace_result.workflows) {
        throw new Error(`Workspace ${workspace_id} not loading.`)
    }
    
    const workflow = workspace_result.workflows[0]
    
    const workflow_result = await db
        .collection<Workflows>('workflows')
        .findOne({ _id: workflow });

    

    console.log("workflow_result", workflow_result)
    console.log("workspace_result", workspace_result)

    if (workflow_result && workspace_result) {
        const result: AppState = {
            workspace: workspace_result,
            workflow: workflow_result
        };
        mongo_client.close();
        return NextResponse.json(result);
    }
    mongo_client.close();

    return NextResponse.json({ error: 'error' });
}
