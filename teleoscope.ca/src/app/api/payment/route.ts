import { get_stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";



export async function POST(request: NextRequest) {

    if (!process.env.TELEOSCOPE_BASE_URL) {
        throw new Error(
            'process.env.TELEOSCOPE_BASE_URL is missing. Please set the environment variable.'
        );
    }

    const data = await request.json();

    const priceId: string = data.product.default_price;
    const userId: string = data.userId;
    const stripe = await get_stripe();

    const customer = await stripe.customers.search({
        query: `metadata["userId"]:"${userId}"`
    })

    if (customer.data.length == 0) {
        throw new Error(`No record of a Stripe customer for this Teleoscope account: ${userId}.`)
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


    return Response.json({ url: session.url });
}
