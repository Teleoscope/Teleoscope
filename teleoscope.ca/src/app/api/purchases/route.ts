import { client } from '@/lib/db';
import { get_stripe } from '@/lib/stripe';

// types
import { Plans } from '@/lib/plans';
import { Products } from '@/types/products';
import { Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';


async function resolve_subscriptions(db: Db, stripe: Stripe, customer_id: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
    const { data: subscriptions } = await stripe.subscriptions.list({
        customer: customer_id?.toString()
    })

    const accumulated_resources: Products = {
        name: "accumulator",
        resources: {
            teams: 0,
            seats: 0,
            storage: 0
        }
    }
    
    for (const subscription of subscriptions) {
        for (const { price } of subscription.items.data ) {
            const product = await stripe.products.retrieve(price.product.toString())
            const plan = Plans.find(plan => plan.name == product.name)
            const resources = plan?.resources
            if (resources) {
                accumulated_resources.resources.teams = accumulated_resources.resources.teams + resources.teams;
                accumulated_resources.resources.seats = accumulated_resources.resources.seats + resources.seats;
                accumulated_resources.resources.storage = accumulated_resources.resources.storage + resources.storage;
            } else {
                throw new Error(`Error for plan ${product.name}.`)
            }
            
        }
    }
    
    const account = await db.collection("accounts").findOne({ stripe_id: customer_id})

    if (account) {
        const accout_update_result = await db.collection("accounts").updateOne({
            _id: account._id,
        }, {
            $set: {
                "resources.amount_teams_available": accumulated_resources.resources.teams,
                "resources.amount_seats_available": accumulated_resources.resources.seats,
                "resources.amount_storage_available": accumulated_resources.resources.storage,
            }
        })

        if (!accout_update_result) {
            throw new Error(`Error updating account for Teleoscope account: ${account._id}`)
        }
    } else {
        throw new Error(`Error retrieving account for stripe customer: ${customer_id}.`)
    }

}

export async function POST(request: NextRequest) {
    const db = (await client()).db();
    const endpointSecret = process.env.STRIPE_TESTING_ENDPOINT_SECRET;
    const sig = request.headers.get('stripe-signature');
    const stripe = await get_stripe()

    try {
        const buff = await readBody(request);
        const body = JSON.parse(buff);
        

        const result = await db.collection('stripe_queue').insertOne(body);

        const event = await stripe.webhooks.constructEvent(
            buff,
            sig!,
            endpointSecret!
        );

        switch (event.type) {
            case 'invoice.paid':
                const invoice: Stripe.Invoice = body.data.object
                console.log(
                    `
                    Adding subscription: ${invoice.subscription}
                    for Stripe Customer: ${invoice.customer} 
                    `
                );
                resolve_subscriptions(db, stripe, invoice.customer)
                
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('Error handling webhook event', err);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }
}

async function readBody(request: NextRequest): Promise<string> {
    const reader = request.body?.getReader();
    if (!reader) {
        throw new Error('No readable body stream found');
    }

    const chunks: Uint8Array[] = [];
    let done, value;

    while (!({ done, value } = await reader.read()).done) {
        chunks.push(value!);
    }

    return Buffer.concat(chunks).toString('utf-8');
}

export const config = {
    api: {
        bodyParser: false
    }
};
