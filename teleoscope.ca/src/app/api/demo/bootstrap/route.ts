export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Argon2id } from 'oslo/password';
import { generateIdFromEntropySize } from 'lucia';
import crypto from 'crypto';
import initialize_user from '@/lib/account';
import { client } from '@/lib/db';
import { validateRequest } from '@/lib/auth';
import { connect } from '@/lib/lucia';
import { Teams } from '@/types/teams';
import { Workspaces } from '@/types/workspaces';
import { isDemoUserById, getDemoCorpusWorkspaceIdAsync } from '@/lib/demoMode';

async function getDefaultWorkspaceId(userId: string): Promise<string | null> {
    const mongoClient = await client();
    const db = mongoClient.db();
    const team = await db.collection<Teams>('teams').findOne({ owner: userId });
    if (!team) {
        return null;
    }
    if (team.workspaces.length > 0) {
        return team.workspaces[0].toString();
    }
    const workspace = await db
        .collection<Workspaces>('workspaces')
        .findOne({ team: team._id }, { sort: { _id: 1 } });
    return workspace?._id?.toString() ?? null;
}

export async function POST() {
    try {
        const { user } = await validateRequest();
        let userId: string | null = null;
        let shouldSetSessionCookie = false;

        if (user && (await isDemoUserById(user.id))) {
            userId = user.id;
        } else {
            userId = generateIdFromEntropySize(10);
            const passwordSeed = `${crypto.randomUUID()}-${Date.now()}`;
            const hashedPassword = await new Argon2id().hash(passwordSeed);
            const email = `demo-${Date.now()}-${userId}@demo.teleoscope.local`;
            await initialize_user(userId, hashedPassword, email);
            shouldSetSessionCookie = true;
        }

        // Prefer the shared demo corpus workspace (auto-discovered by label if not in env)
        let workspaceId = await getDemoCorpusWorkspaceIdAsync();
        if (!workspaceId) {
            workspaceId = await getDefaultWorkspaceId(userId);
        }
        if (!workspaceId) {
            return NextResponse.json(
                { message: 'Unable to resolve workspace for demo user.' },
                { status: 500 }
            );
        }

        const response = NextResponse.json({
            workspace_id: workspaceId,
            user_id: userId,
            read_only_uploads: true
        });

        if (shouldSetSessionCookie) {
            const lucia = await connect();
            const session = await lucia.createSession(userId, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            response.cookies.set(
                sessionCookie.name,
                sessionCookie.value,
                sessionCookie.attributes
            );
        }

        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[demo/bootstrap] Unhandled error:', message);
        return NextResponse.json(
            { message: 'Demo workspace setup failed.', detail: message },
            { status: 500 }
        );
    }
}
