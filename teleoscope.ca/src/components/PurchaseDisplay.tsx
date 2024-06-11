'use client';;
import { useSWRF } from '@/lib/swr';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from '@/components/ProductCard';
import Stripe from 'stripe';
import { useUserContext } from '@/context/UserContext';

export default function PurchaseDisplay() {
    const [products, setProducts] = useState([]);
    const { userId: owner } = useUserContext();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data } = await axios.get('/api/products');
        setProducts(data);
    };
    
    const {
        data: account,
        error,
        isLoading
    } = useSWRF(`/api/account`);

    if (isLoading) {
        return <>Loading...</>;
    }

    const {
        amount_teams_available,
        amount_seats_available,
        amount_storage_available,
        amount_teams_used,
        amount_seats_used,
        amount_storage_used
    } = account.resources;

    const {
        name,
        plan_team_amount,
        plan_collaborator_amount,
        plan_storage_amount,
        note
    } = account.plan;

    return (
        <div>
            <h2 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
                Hello, {account.users.owner}
            </h2>

            <hr />

            <p>
                You are on the {name} plan. With that plan, you get these
                resources:
            </p>

            <p>You can manage {plan_team_amount} teams.</p>
            <p>
                You can invite {plan_collaborator_amount - 1} other people to
                work with you.
            </p>
            <p>You can store up to {plan_storage_amount} megabytes of data.</p>

            <hr />

            <h2 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
                Usage
            </h2>

            <h3>Teams</h3>
            <p>Number of teams total: {amount_teams_available}</p>
            <p>Number of teams used: {amount_teams_used}</p>

            <h3>Team members</h3>
            <p>Number of team members total: {amount_seats_available}</p>
            <p>Number of team members assigned: {amount_seats_used}</p>

            <h3>Storage</h3>
            <p>
                Number of megabytes of storage total: {amount_storage_available}
            </p>
            <p>Number of megabytes of storage used: {amount_storage_used}</p>

            <hr />
            <h2 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
                Pay per use
            </h2>
            <p>
                Upgrade your plan and purchase add-ons to manage more teams and
                collaborators.
            </p>
            {products &&
                products.map((product: Stripe.Product) => (
                    <ProductCard product={product} key={product.id} />
                ))}
        </div>
    );
}
