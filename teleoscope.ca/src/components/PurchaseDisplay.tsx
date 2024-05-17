"use client";
import useSWR from 'swr';
import { fetcher } from "@/lib/swr";
import { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from '@/components/ProductCard';
import Stripe from 'stripe';




export default function PurchaseDisplay({ owner }: { owner: string }) {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchProducts()
    }, [])
  
    const fetchProducts = async () => {
        const { data } = await axios.get('/api/products')
        setProducts(data)
    }
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

  const {
    name,
    plan_token_topup,
    plan_team_amount,
    plan_collaborator_amount,
    plan_storage_amount,
    note
  } = account.plan

  

  return (
    <div>
            <h2>Hello, {account.users.owner}</h2>

            <p>You are on the {name} plan. With that plan, you get these resources:</p>
            <p>You get {plan_token_topup} tokens per month.</p>
            <p>You can manage {plan_team_amount} teams.</p>
            <p>You can invite {plan_collaborator_amount - 1} other people to work with you.</p>
            <p>You can store up to {plan_storage_amount} megabytes of data.</p>
            
            <p>You can also top these up with purchases, as below.</p>

            <h2>Usage</h2>
            
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
            
            <h2>Pay per use</h2>
              <p>Buy more storage</p>
              <p>Buy more tokens</p>
              <p>Upgrade your plan to manage more teams and collaborators.</p>
              {products && products.map((product: Stripe.Product) => (
                  <ProductCard product={product} key={product.id} />
              ))}
        </div>

          
  );
}