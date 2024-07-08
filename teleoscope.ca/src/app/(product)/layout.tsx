import Menu from '@/components/landing/ProductMenu';
import UserContext from '@/context/UserContext';
import { validateRequest } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
    children // will be a page or nested layout
}: {
    children: React.ReactNode;
}) {
    const { user } = await validateRequest();
    if (!user) {
        return redirect('/signin');
    }

    return (
        <section>
            <Menu />
            <UserContext userId={user.id}>{children}</UserContext>
        </section>
    );
}
