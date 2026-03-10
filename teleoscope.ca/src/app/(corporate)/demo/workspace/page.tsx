'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type DemoBootstrapResponse = {
    workspace_id: string;
    user_id: string;
    read_only_uploads: boolean;
};

export const dynamic = 'force-dynamic';

export default function DemoWorkspaceBootstrapPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function bootstrap() {
            try {
                const response = await fetch('/api/demo/bootstrap', {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store'
                });
                if (!response.ok) {
                    throw new Error(`Failed to start demo workspace (${response.status}).`);
                }
                const data: DemoBootstrapResponse = await response.json();
                if (!cancelled) {
                    router.replace(`/workspace/${data.workspace_id}?demo=1`);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Unable to bootstrap demo workspace.'
                    );
                }
            }
        }
        bootstrap();
        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
            <h1 className="text-3xl font-bold">Preparing your demo workspace</h1>
            <p className="mt-3 text-neutral-600">
                Creating an anonymous session and loading the shared corpus.
            </p>
            {error ? (
                <p className="mt-5 rounded border border-red-300 bg-red-50 p-3 text-red-700">
                    {error}
                </p>
            ) : null}
        </main>
    );
}
