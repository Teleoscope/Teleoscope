import { client } from '@/lib/db';
import { Users } from '@/types/users';

const DEMO_EMAIL_SUFFIX = '@demo.teleoscope.local';

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

export function getDemoCorpusWorkspaceId(): string | null {
    const workspaceId = process.env.DEMO_CORPUS_WORKSPACE_ID?.trim();
    return workspaceId ? workspaceId : null;
}

export function resolveDemoCorpusWorkspaceId(workspaceId: string): string {
    return getDemoCorpusWorkspaceId() ?? workspaceId;
}
