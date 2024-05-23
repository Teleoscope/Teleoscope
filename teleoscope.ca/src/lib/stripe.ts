'use server';

import { Stripe } from 'stripe';

import { client } from '@/lib/db';
import { Plans } from '@/lib/plans';

const key =
    process.env.NODE_ENV == 'production'
        ? process.env.STRIPE_CLIENT_SECRET
        : process.env.STRIPE_TEST_SECRET_KEY;

if (!process.env.STRIPE_TEST_SECRET_KEY) {
    throw new Error(
        'process.env.STRIPE_TEST_SECRET_KEY is missing. Please set the environment variable.'
    );
}

if (!process.env.STRIPE_CLIENT_SECRET) {
    throw new Error(
        'process.env.STRIPE_CLIENT_SECRET is missing. Please set the environment variable.'
    );
}



export async function recreate_products() {
    const stripe = await get_stripe();
    const db = (await client()).db();

    for (const product of Plans) {
        const product_result = await stripe.products.create({
            name: product.name,
            metadata: {
                teams: product.resources.teams,
                seats: product.resources.seats,
                storage: product.resources.storage
            }
        });
        const mongo_result = await db.collection('products').insertOne({
            name: product.name,
            stripe_id: product_result.id,
            resources: product.resources
        });
    }
}

let _stripe: Stripe | undefined;
export async function get_stripe(): Promise<Stripe> {
    if (!_stripe) {
        _stripe = new Stripe(key!, {
            apiVersion: '2024-04-10'
        });
    }
    return _stripe;
}
