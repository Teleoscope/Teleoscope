export const dynamic = 'force-dynamic';
import { validateRequest } from '@/lib/auth';
import { dbOp } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Documents } from '@/types/documents';
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
    const raw_limit = request.nextUrl.searchParams.get('limit');
    const raw_skip = request.nextUrl.searchParams.get('skip');

    const limit = raw_limit ? Math.max(parseInt(raw_limit), 10000) : 1000;
    const skip = raw_skip ? parseInt(raw_skip) : 0;

    const workspaceQuery = { workspace: new ObjectId(effectiveWorkspace) };
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        if (!query) {
            return await db
                .collection<Documents>('documents')
                .find(workspaceQuery)
                .skip(skip)
                .limit(limit)
                .project({ _id: 1 })
                .toArray();
        }

        try {
            return await db
                .collection<Documents>('documents')
                .find({ ...workspaceQuery, $text: { $search: query } })
                .skip(skip)
                .limit(limit)
                .project({ _id: 1 })
                .toArray();
        } catch (error) {
            if (!isTextIndexError(error)) {
                throw error;
            }

            // CI/dev fallback when a text index is not available yet.
            const safeQuery = escapeRegex(query);
            return await db
                .collection<Documents>('documents')
                .find({
                    ...workspaceQuery,
                    $or: [
                        { text: { $regex: safeQuery, $options: 'i' } },
                        { title: { $regex: safeQuery, $options: 'i' } }
                    ]
                })
                .skip(skip)
                .limit(limit)
                .project({ _id: 1 })
                .toArray();
        }
    });

    return NextResponse.json(result ?? []);
}
