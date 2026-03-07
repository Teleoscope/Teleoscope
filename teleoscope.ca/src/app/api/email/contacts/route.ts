export const dynamic = 'force-dynamic';
// app/api/email/contacts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LoopsClient } from 'loops';

const loops = new LoopsClient(process.env.LOOPS_API_KEY as string);

export async function POST(request: NextRequest) {
    try {
        const res = await request.json();
        const email = res['email'];
        const contactProperties = {};

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Missing email' },
                { status: 400 }
            );
        }

        // updateContact() creates or updates a contact.
        const resp: {
            success: boolean;
            id?: string;
            message?: string;
        } = await loops.updateContact(email, contactProperties);

        if (resp.success) {
            return NextResponse.json({ success: true, id: resp.id ?? null });
        }

        return NextResponse.json(
            { success: false, message: resp.message ?? 'Loops update failed' },
            { status: 502 }
        );
    } catch {
        return NextResponse.json(
            { success: false, message: 'Loops request failed' },
            { status: 502 }
        );
    }
}
