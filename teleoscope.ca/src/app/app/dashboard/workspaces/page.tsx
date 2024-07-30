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
        <div className="flex flex-col h-full w-full p-4  overflow-hidden items-center">
            <section className="flex flex-col h-full w-full p-4 max-w-[2000px] overflow-hidden items-center">
                <div className="flex flex-row justify-between pt-2 pb-6 items-center w-full">
                    <div className="flex flex-col ">
                        <Link
                            href={'/'}
                            className="text-primary-600 font-semibold text-sm"
                        >
                            Teleoscope
                        </Link>
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <span className="text-sm text-neutral-700 font-medium italic  px-1">
                            {user ? <>{user.id}</> : <>User</>}
                        </span>
                    </div>

                    <Link href={'/signout'}>Sign out</Link>
                </div>
                <Workspaces />
            </section>
        </div>
    );
}
