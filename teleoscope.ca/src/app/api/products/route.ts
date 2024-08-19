import { get_stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const stripe = await get_stripe()
    const products = await stripe.products.list({
        ids: [
            "prod_Q7THLLomrGha3R", // seat
            "prod_Q7THkRlaVUJu3X", // storage
            "prod_Q7THnfgcIQLNCL", // team
            "prod_Q7TJHpWMkpkXJK", // researcher
            "prod_Q9hZqN8w7Tzjt0"  // student
        ]
        // limit: 4,
    });

    return NextResponse.json(products.data.reverse());
}
