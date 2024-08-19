'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useState } from 'react';
import Link from "next/link";

// FIXME: This is a placeholder for the options - should be replaced with an API for the options
const STORAGE_OPTIONS = [
    {
        label: '100GB',
        value: '100'
    },
    {
        label: '500GB',
        value: '500'
    },
    {
        label: '1TB',
        value: '1000'
    }
] as const;

export default function MoreStorageModal() {
    // const { user, account } = useUserContext();
    const [selectedStorage, setSelectedStorage] = useState('100');
    const baseURL = "/dashboard/account/upgrade"; //FIXME: This should be replaced with the actual URL // Stripe

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    className="border flex-shrink-0  flex flex-col justify-center items-center overflow-hidden"
                >
                    Buy more storage
                </Button>
            </DialogTrigger>
            <DialogContent className="px-0 pb-0">
                <DialogHeader className="border-b pb-4 px-4">
                    <DialogTitle>Buy more storage</DialogTitle>
                </DialogHeader>
                    <div

                        className="w-full space-y-2 p-8 pt-0"
                    >

                        <p className="text-sm text-neutral-600">
                            Select the amount of storage you want to purchase
                        </p>
                        <Select
                            onValueChange={(value) => setSelectedStorage(value)}
                            defaultValue={selectedStorage}
                        >

                                <SelectTrigger>
                                    <SelectValue placeholder="Select an option"/>
                                </SelectTrigger>
                            <SelectContent>
                                {STORAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className={"flex w-full items-center justify-center pt-10 gap-2"}>
                        <Link
                            className="btn btn-primary  p-1 px-2 bg-appPrimary-600 rounded-md text-white"
                            href={`${baseURL}?storage=${selectedStorage}`}
                            type="submit" >Go to checkout
                        </Link>
                        </div>
                    </div>

            </DialogContent>
        </Dialog>
    );
}
