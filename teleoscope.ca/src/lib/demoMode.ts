import { client } from '@/lib/db';
import { Users } from '@/types/users';
import { Workspaces } from '@/types/workspaces';

const DEMO_EMAIL_SUFFIX = '@demo.teleoscope.local';

/** Must match the label used by scripts/seed-demo-corpus.py (DEMO_WORKSPACE_LABEL). */
export const DEMO_CORPUS_WORKSPACE_LABEL = 'Demo corpus';

export function isDemoUserEmail(email: string): boolean {
    return email.endsWith(DEMO_EMAIL_SUFFIX);
}

export async function isDemoUserById(userId: string): Promise<boolean> {
    const mongoClient = await client();
    const db = mongoClient.db();
    const user = await db
        .collection<Users>('users')
        .findOne({ _id: userId }, { projection: { emails: 1 } });
    if (!user?.emails?.length) {
        return false;
    }
    return user.emails.some(isDemoUserEmail);
}

/** Sync: only from env. Prefer getDemoCorpusWorkspaceIdAsync() so the app can auto-discover by label. */
export function getDemoCorpusWorkspaceId(): string | null {
    const workspaceId = process.env.DEMO_CORPUS_WORKSPACE_ID?.trim();
    return workspaceId ? workspaceId : null;
}

let demoCorpusWorkspaceIdCache: string | null | undefined = undefined;

/**
 * Returns the demo corpus workspace ID: from env if set, otherwise looks up the workspace
 * with label "Demo corpus" in MongoDB (same label as seed-demo-corpus.py). Result is cached.
 * No need to set DEMO_CORPUS_WORKSPACE_ID in .env when the corpus has been seeded.
 */
export async function getDemoCorpusWorkspaceIdAsync(): Promise<string | null> {
    const fromEnv = process.env.DEMO_CORPUS_WORKSPACE_ID?.trim();
    if (fromEnv) {
        return fromEnv;
    }
    if (demoCorpusWorkspaceIdCache !== undefined) {
        return demoCorpusWorkspaceIdCache;
    }
    try {
        const mongoClient = await client();
        const db = mongoClient.db();
        const workspace = await db
            .collection<Workspaces>('workspaces')
            .findOne({ label: DEMO_CORPUS_WORKSPACE_LABEL }, { projection: { _id: 1 } });
        demoCorpusWorkspaceIdCache = workspace?._id?.toString() ?? null;
        return demoCorpusWorkspaceIdCache;
    } catch {
        demoCorpusWorkspaceIdCache = null;
        return null;
    }
}

/** Use this in API routes so demo corpus is resolved from env or by label. */
export async function resolveDemoCorpusWorkspaceIdAsync(workspaceId: string): Promise<string> {
    const demoId = await getDemoCorpusWorkspaceIdAsync();
    return demoId ?? workspaceId;
}

/** @deprecated Prefer resolveDemoCorpusWorkspaceIdAsync so the app can auto-discover the corpus. */
export function resolveDemoCorpusWorkspaceId(workspaceId: string): string {
    return getDemoCorpusWorkspaceId() ?? workspaceId;
}
