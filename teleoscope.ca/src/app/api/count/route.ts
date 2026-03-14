export const dynamic = 'force-dynamic';
import { validateRequest } from '@/lib/auth';
import { Documents } from '@/types/documents';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { resolveDemoCorpusWorkspaceIdAsync } from '@/lib/demoMode';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const query = request.nextUrl.searchParams.get('query');
    const workspace = request.nextUrl.searchParams.get('workspace');
    if (!workspace) {
        return NextResponse.json({ message: 'workspace is required.' }, { status: 400 });
    }
    const effectiveWorkspace = await resolveDemoCorpusWorkspaceIdAsync(workspace);

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const q = query
            ? { $text: { $search: query }, workspace: new ObjectId(effectiveWorkspace) }
            : { workspace: new ObjectId(effectiveWorkspace) };
        return await db
            .collection<Documents>('documents')
            .countDocuments(q)
    });

    return NextResponse.json(result);
}



