'use client';;
import { useUserContext } from '@/context/UserContext';
import { Teams } from '@/types/teams';
import axios from 'axios';
import { ChangeEvent, FormEvent, useState } from 'react';


const LabeledInput = ({
    children,
    teamId
}: {
    children: React.ReactNode | null,
    teamId: string
}) => {
    const [inputValue, setInputValue] = useState('');
    
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
        bodyFormData.append('teamId', teamId);
        bodyFormData.append('email', inputValue);

        // console.log('Submitted value:', inputValue);
        axios.post('/api/users', bodyFormData);
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
            <button type="submit">Submit</button>
        </form>
    );
};

export default function TeamCard({
    team,
    key
}: {
    team: Teams;
    key: string;
}) {
    const { userId } = useUserContext()
    
    return (
        <div key={key}>
            <h1>{team.label}</h1>
            <LabeledInput teamId={team._id}>Add user to team by email</LabeledInput>
            
        </div>
    );
}