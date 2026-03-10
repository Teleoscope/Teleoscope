export function isDemoPublicMode(): boolean {
    return process.env.DEMO_PUBLIC_MODE === '1';
}

export function isDemoReadOnlyMode(): boolean {
    if (!isDemoPublicMode()) {
        return false;
    }
    return process.env.DEMO_ALLOW_UPLOADS !== '1';
}

export function getDemoCorpusWorkspaceId(): string | null {
    const workspaceId = process.env.DEMO_CORPUS_WORKSPACE_ID?.trim();
    return workspaceId ? workspaceId : null;
}

export function resolveDemoCorpusWorkspaceId(workspaceId: string): string {
    if (!isDemoPublicMode()) {
        return workspaceId;
    }
    return getDemoCorpusWorkspaceId() ?? workspaceId;
}
