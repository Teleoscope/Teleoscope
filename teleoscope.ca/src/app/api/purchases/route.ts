import { client } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";


export async function POST(request: NextRequest) {
    const db = (await client()).db()

    const endpointSecret = process.env.STRIPE_TESTING_ENDPOINT_SECRET;

    const sig = request.headers.get('stripe-signature');

    
    const buff = await request.text();
    const body = JSON.parse(buff);

    const result = db.collection("stripe_queue").insertOne(body)

    const event = stripe.webhooks.constructEvent(buff, sig!, endpointSecret!)

    switch (event.type) {
        case 'invoice.payment_succeeded':
            console.log(`updating account for ${body.data.object.customer}`)
    }

    return Response.json(result);

}

export const config = {
    api: {
      bodyParser: false,
    },
  };

const buffer = (req: NextRequest) => {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
  
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
  
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
  
      req.on('error', reject);
    });
  };
