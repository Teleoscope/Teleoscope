"use client";;
import Workspace from '@/components/Workspace';

export default function WorkspacePage({
    params
}: {
    params: { slug: string };
}) {

    return <Workspace workspace={params.slug} />
    
}
