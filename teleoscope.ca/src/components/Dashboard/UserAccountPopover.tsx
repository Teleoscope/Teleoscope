'use client';;
import { useUserContext } from '@/context/UserContext';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '../ui/button';
import { ChevronDown, DoorOpenIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useShepherd } from '@/context/Shepherd';

export const UserAccountPopover = () => {
    const { user, account } = useUserContext();
    const userDisplayName = user?.firstName || user?.emails?.[0] || 'User';
    const tour = useShepherd()
    const handleClick = () => {
        tour.start()
    }


    return (
        <div className="flex items-center absolute top-2 right-2 justify-end w-full cursor-pointer p-2">
            <div className="p-2">
                <p className='text-sm p-2'> 
                    New to Teleoscope?
                    <span className='p-1'></span>
                    <Button onClick={handleClick} className='text-sm' variant="outline" size="sm">
                        Start Tour
                    </Button>
                </p>
            </div>
            <Popover>
                <PopoverTrigger>
                    <Button
                        className="flex items-center gap-4 group bg-gray-50 py-6 px-2 w-52"
                        variant={'outline'}
                    >
                        <div className="flex rounded-lg bg-gray-100 p-2 border">
                            <UserIcon size={20} />
                        </div>
                        <div className="flex flex-col items-start w-full">
                            <span className="text-sm font-bold group-hover:text-gray-800">
                                {userDisplayName}
                            </span>
                            <span className="text-xs text-gray-500 group-hover:text-gray-800">
                                {account.plan.name}
                            </span>
                        </div>
                        <ChevronDown size={28} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className=" max-w-sm  w-52 p-2 " align="end">
                    <div className="flex flex-col text-sm gap-4 px-1">
                        <Link
                            href="/auth/signin"
                            className="flex items-center gap-3"
                        >
                            <DoorOpenIcon size={16} />
                            Sign Out
                        </Link>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
