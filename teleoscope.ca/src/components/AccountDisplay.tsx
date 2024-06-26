"use client";;
import { useSWRF } from "@/lib/swr";
import { useUserContext } from '@/context/UserContext';

export default function AccountDisplay() {
  const { userId: owner } = useUserContext();

  const { data: account, error, isLoading } = useSWRF(`/api/account`)

  if (isLoading) {
    return <>Loading...</>
  }

  const { 
    amount_teams_available,
    amount_seats_available,
    amount_storage_available,
    amount_teams_used,
    amount_seats_used,
    amount_storage_used
  } = account.resources;

    return (
        <div>
            <h2>Hello, {account.users.owner}</h2>
            
            <h3>Teams</h3>
            <p>Number of teams total: {amount_teams_available}</p>
            <p>Number of teams used: {amount_teams_used}</p>

            <h3>Collaborators</h3>
            <p>Number of collaborators total: {amount_seats_available}</p>
            <p>Number of collaborators total: {amount_seats_used}</p>

            <h3>Storage</h3>
            <p>Number of megabytes of storage total: {amount_storage_available}</p>
            <p>Number of megabytes of storage used: {amount_storage_used}</p>

        </div>
    )    
}