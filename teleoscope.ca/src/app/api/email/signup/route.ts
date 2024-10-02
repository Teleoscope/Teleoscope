// app/api/email/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LoopsClient } from 'loops';

const loops = new LoopsClient(process.env.LOOPS_API_KEY as string);

export async function POST(request: NextRequest) {
    const res = await request.json();

    const email = res['email'];
    const contactProperties = {};

    // Note: sendEvent() will send an event (must be registered in Loops)

    const resp: {
        success: boolean;
        id?: string;
        message?: string;
    } = await loops.sendEvent({
        email: email,
        eventName: 'newUser'
    });

    if (resp.success) {
        return NextResponse.json({ success: resp.success });
    } else {
        return NextResponse.error();
    }
}
