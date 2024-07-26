import { client } from '@/lib/db';
import { get_stripe, resolve_subscriptions_by_customer_id } from '@/lib/stripe';

// types

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
    const mongo_client = await client()
    const db = mongo_client.db()
    
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
                if (invoice.customer) {
                    resolve_subscriptions_by_customer_id(invoice.customer.toString())
                } else {
                    throw new Error(`Field "invoice.customer" null when executing response to "invoice.paid" event.`)
                }
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