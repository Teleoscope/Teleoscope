import Workspaces from '@/components/Workspaces/Workspaces';
import { validateRequest } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WorkspacesPage() {
    const { user } = await validateRequest();
    if (!user) {
        return redirect('/signin');
    }
    
    return (
        <div className="flex flex-col h-full w-full p-2   overflow-hidden items-center">
            <section className="flex flex-col h-full w-full pt-20 max-w-[2000px] overflow-y-scroll items-center">
                <Workspaces />
            </section>
        </div>
    );
}
