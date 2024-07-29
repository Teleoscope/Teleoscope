'use server';
import { Stripe } from 'stripe';

import { client } from '@/lib/db';
import { Plans } from '@/lib/plans';
import { Products } from '@/types/products';
import { ObjectId } from 'mongodb';

const key = process.env.STRIPE_TEST_SECRET_KEY
    // process.env.NODE_ENV == 'production'
        // ? process.env.STRIPE_CLIENT_SECRET
        // : process.env.STRIPE_TEST_SECRET_KEY;

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

///////////////////////////////////////////////////////////////////////////////////////////////////
// Singleton Stripe connection
let _stripe: Stripe | undefined;
export async function get_stripe(): Promise<Stripe> {
    if (!_stripe) {
        _stripe = new Stripe(key!, {
            apiVersion: '2024-04-10'
        });
    }
    return _stripe;
}
///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Recreates the entire product catalogue. Should only be called when the product catalogue
 * needs to be changed. Mostly in here as a helper function during testing, maybe should be
 * taken out once we go to production.
 */
export async function recreate_products() {
    const stripe = await get_stripe();
    const mongo_client = await client();
    const db = mongo_client.db();

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



/**
 * Resolves the database subscription with the Stripe subscription. 
 * Since Stripe is the payment management system, it is the source of universal truth.
 * 
 * @param customer_id the Stripe ID string
 */
export async function resolve_subscriptions_by_customer_id(customer_id: string) {
    const account = await getAccountByStripeId(customer_id);
    if (!account) {
        throw new Error(`Error retrieving Teleoscope account for Stripe customer: ${customer_id}.`);
    }
    const accumulated_resources = await accumulateResources(customer_id);
    await updateAccountResources(account._id, accumulated_resources);
}

export async function resolve_subscriptions_by_user_id(user_id: string) {
    const account = await getAccountByUserId(user_id);
    if (!account) {
        throw new Error(`Error retrieving Teleoscope account for: ${user_id}.`);
    }
    const customer_id = account.stripe_id
    const accumulated_resources = await accumulateResources(customer_id);
    await updateAccountResources(account._id, accumulated_resources);
}

async function getAccountByUserId(userId: string) {
    const mongo_client = await client();
    const db = mongo_client.db();
    const result = await db.collection('accounts').findOne({ "users.owner": userId });
    return result
}

async function getAccountByStripeId(customer_id: string) {
    const mongo_client = await client();
    const db = mongo_client.db();
    const result = await db.collection('accounts').findOne({ stripe_id: customer_id });
    return result
}

async function accumulateResources(customer_id: string): Promise<Products> {
    const stripe = await get_stripe();
    
    const { data: subscriptions } = await stripe.subscriptions.list({
        customer: customer_id?.toString()
    });

    const accumulated_resources: Products = {
        name: 'accumulator',
        resources: {
            teams: 0,
            seats: 0,
            storage: 0
        }
    };

    for (const subscription of subscriptions) {
        for (const { price } of subscription.items.data) {
            const product = await stripe.products.retrieve(price.product.toString());
            const plan = Plans.find((plan) => plan.name == product.name);
            const resources = plan?.resources;
            if (resources) {
                accumulated_resources.resources.teams += resources.teams;
                accumulated_resources.resources.seats += resources.seats;
                accumulated_resources.resources.storage += resources.storage;
            } else {
                throw new Error(`Error for plan ${product.name}.`);
            }
        }
    }
    return accumulated_resources;
}

async function updateAccountResources(account: ObjectId, accumulated_resources: Products) {
    const mongo_client = await client();
    const db = mongo_client.db();
    const account_update_result = await db.collection('accounts').updateOne(
        {
            _id: account
        },
        {
            $set: {
                'resources.amount_teams_available': accumulated_resources.resources.teams,
                'resources.amount_seats_available': accumulated_resources.resources.seats,
                'resources.amount_storage_available': accumulated_resources.resources.storage
            }
        }
    );

    if (!account_update_result) {
        throw new Error(`Error updating account for Teleoscope account: ${account}`);
    }
}
