'use client';
import { useUserContext } from '@/context/UserContext';
import { useSWRF } from '@/lib/swr';
import { Teams } from '@/types/teams';
import { Accounts } from '@/types/accounts';

import TeamCard from '@/components/TeamCard';
import { ChangeEvent, FormEvent, useState } from 'react';
import axios from 'axios';

const LabeledInput = ({
    children,
    accounts
}: {
    children: React.ReactNode | null;
    accounts: Array<string>;
}) => {
    const { userId } = useUserContext();
    const [inputValue, setInputValue] = useState('');
    const [dropdownValue, setDropdownValue] = useState('');

    const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
        if (event.target) {
            setDropdownValue(event.target.value);
        } else {
            setDropdownValue('');
        }
    };
    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target) {
            setInputValue(event.target.value);
        } else {
            setInputValue('');
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        // Handle the form submission logic here

        var bodyFormData = new FormData();
        bodyFormData.append('label', inputValue);
        bodyFormData.append('owner', userId);
        bodyFormData.append('account', dropdownValue);

        // console.log('Submitted value:', inputValue);
        axios.post('/api/teams', bodyFormData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>
                    {children}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                    />
                </label>
            </div>
            <div>
                <label>
                    Select an account for the new team:
                    <select
                        value={dropdownValue}
                        onChange={(e) => handleDropdownChange(e)}
                    >
                        <option value="" key="default">
                            Select...
                        </option>
                        {accounts &&
                            accounts.map((account) => (
                                <option key={account} value={account}>
                                    {account}
                                </option>
                            ))}
                    </select>
                </label>
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default function TeamDisplay() {
    const { userId: user } = useUserContext();
    const { data: teams } = useSWRF(`/api/teams?user=${user}`);
    const { data: accounts } = useSWRF(`/api/accounts?user=${user}`);

    return (
        <div>
            {accounts ? (
                <LabeledInput accounts={accounts.map((a: Accounts) => a._id)}>
                    <h1>Make a new team</h1>
                </LabeledInput>
            ) : (
                <>Loading...</>
            )}

            {teams &&
                teams.map((team: Teams) => (
                    <TeamCard team={team} key={team._id!.toString()} />
                ))}
        </div>
    );
}
