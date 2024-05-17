"use client";
import useSWR from 'swr';
import { fetcher } from "@/lib/swr";

export default function AccountDisplay({ owner }: { owner: string }) {

  const { data: account, error, isLoading } = useSWR(`/api/account?owner=${owner}`, fetcher)

  if (isLoading) {
    return <>Loading...</>
  }

  const { 
    amount_teams_available,
    amount_tokens_available,
    amount_seats_available,
    amount_storage_available,
    amount_teams_used,
    amount_tokens_used,
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

            <h3>Tokens</h3>
            <p>Number of tokens available this month: {amount_tokens_available}</p>
            <p>Number of tokens used this month: {amount_tokens_used}</p>
        </div>
    )    
}