import { stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    let data = await request.json();

    let priceId: string = data.product.default_price;

    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: priceId,
                quantity: 1
            }
        ],
        mode: 'subscription',
        success_url: 'http://localhost:3000',
        cancel_url: 'http://localhost:3000'
    });


    return Response.json({ url: session.url });
}
