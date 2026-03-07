export const dynamic = 'force-dynamic';
import { get_stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const stripe = await get_stripe();
    if (!stripe) {
        return NextResponse.json(
            { error: 'Stripe integration is disabled.' },
            { status: 503 }
        );
    }

    try {
        const products = await stripe.products.list({
            ids: [
                'prod_Q7THLLomrGha3R', // seat
                'prod_Q7THkRlaVUJu3X', // storage
                'prod_Q7THnfgcIQLNCL', // team
                'prod_Q7TJHpWMkpkXJK', // researcher
                'prod_Q9hZqN8w7Tzjt0' // student
            ]
        });
        return NextResponse.json(products.data.reverse());
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Unable to load products.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
