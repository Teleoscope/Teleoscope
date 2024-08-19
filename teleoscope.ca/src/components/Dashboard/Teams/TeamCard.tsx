import { Teams } from '@/types/teams';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TeamCard({ team, key }: { team: Teams; key: string }) {
    return (
        <div
            key={key}
            className="border flex-shrink-0  bg-gray-100 rounded-lg flex flex-col w-full justify-center items-center overflow-hidden"
        >
            <Link
                href={`resource-usage/teams/${team._id}`}
                className={`w-full flex justify-center items-center text-md p-2 h-40 flex-shrink-0 font-medium gap-2 text-center border-none}`}
            >
                {team.label}
            </Link>
        </div>
    );
}
