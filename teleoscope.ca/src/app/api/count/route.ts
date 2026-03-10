export const dynamic = 'force-dynamic';
import { validateRequest } from '@/lib/auth';
import { Documents } from '@/types/documents';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { resolveDemoCorpusWorkspaceId } from '@/lib/demoMode';

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTextIndexError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const err = error as { code?: unknown; message?: unknown; errmsg?: unknown };
    const message = String(err.message ?? err.errmsg ?? '').toLowerCase();
    return (
        err.code === 27 ||
        message.includes('text index required') ||
        message.includes('index not found for text query')
    );
}

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
    const effectiveWorkspace = resolveDemoCorpusWorkspaceId(workspace);

    const workspaceQuery = { workspace: new ObjectId(effectiveWorkspace) };
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        if (!query) {
            return await db.collection<Documents>('documents').countDocuments(workspaceQuery);
        }

        try {
            return await db
                .collection<Documents>('documents')
                .countDocuments({ ...workspaceQuery, $text: { $search: query } });
        } catch (error) {
            if (!isTextIndexError(error)) {
                throw error;
            }

            const safeQuery = escapeRegex(query);
            return await db.collection<Documents>('documents').countDocuments({
                ...workspaceQuery,
                $or: [
                    { text: { $regex: safeQuery, $options: 'i' } },
                    { title: { $regex: safeQuery, $options: 'i' } }
                ]
            });
        }
    });

    return NextResponse.json(result ?? 0);
}



