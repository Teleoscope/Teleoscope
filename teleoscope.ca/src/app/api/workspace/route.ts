import { validateRequest } from '@/lib/auth';
import { Workspaces } from '@/types/workspaces';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from "@/lib/db";
import { Db, MongoClient } from "mongodb";
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

    const result = await dbOp(async (client: MongoClient, db: Db) => {

    return await db
        .collection<Workspaces>('workspaces')
        .findOne({_id: workspace});
    })

    return NextResponse.json(result);
}
