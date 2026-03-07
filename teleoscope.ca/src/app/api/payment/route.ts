export const dynamic = 'force-dynamic';
import { get_stripe } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        if (!process.env.TELEOSCOPE_BASE_URL) {
            return NextResponse.json(
                { error: 'Missing TELEOSCOPE_BASE_URL configuration.' },
                { status: 500 }
            );
        }

        const data = await request.json();
        const priceId: string | undefined = data?.product?.default_price;
        const userId: string | undefined = data?.userId;
        if (!priceId || !userId) {
            return NextResponse.json(
                { error: 'Missing price or user id.' },
                { status: 400 }
            );
        }

        const stripe = await get_stripe();
        if (!stripe) {
            return NextResponse.json(
                { error: 'Stripe integration is disabled.' },
                { status: 503 }
            );
        }

        const customer = await stripe.customers.search({
            query: `metadata["userId"]:"${userId}"`
        });

        if (customer.data.length === 0) {
            return NextResponse.json(
                {
                    error: `No Stripe customer exists for Teleoscope user ${userId}.`
                },
                { status: 404 }
            );
        }

        const session = await stripe.checkout.sessions.create({
            customer: customer.data[0].id,
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            metadata: {
                userId: userId
            },
            mode: 'subscription',
            success_url: `${process.env.TELEOSCOPE_BASE_URL}/dashboard/account`,
            cancel_url: `${process.env.TELEOSCOPE_BASE_URL}/dashboard/account`
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Unable to create checkout session.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
