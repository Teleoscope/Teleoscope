import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const products = await stripe.products.list({
        // limit: 4,
    });
    return NextResponse.json(products.data.reverse());
}
