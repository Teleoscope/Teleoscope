import { validateRequest } from '@/lib/auth';
import { dbOp } from '@/lib/db';
import { Workflows } from '@/types/workflows';
import { Workspaces } from '@/types/workspaces';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { user } = await validateRequest();
        const workspaceId = request.nextUrl.searchParams.get('workspace');
        const workflowId = request.nextUrl.searchParams.get('workflow');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID missing.' }, { status: 400 });
        }

        const workspaceObjectId = new ObjectId(workspaceId);

        if (!user) {
            return NextResponse.json({ error: 'User not signed in.' }, { status: 401 });
        }

        const result = await dbOp(async (client: MongoClient, db: Db) => {
            const workspaceResult = await db
                .collection<Workspaces>('workspaces')
                .findOne({ _id: workspaceObjectId });

            if (!workspaceResult || !workspaceResult.workflows) {
                throw new Error(`Workspace ${workspaceId} not found or has no workflows.`);
            }

            const workflowObjectId = workflowId ? new ObjectId(workflowId) : workspaceResult.workflows[0];

            const workflowResult = await db
                .collection<Workflows>('workflows')
                .findOne({ _id: workflowObjectId });

            if (!workflowResult) {
                throw new Error(`Workflow ${workflowObjectId} not found.`);
            }

            const appState = {
                workspace: workspaceResult,
                workflow: workflowResult
            };

            return appState;
        });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
