// app/api/email/signup/route.ts
'use server';
import { LoopsClient } from 'loops';

const loops = new LoopsClient(process.env.LOOPS_API_KEY as string);

export async function newUser({email}:{email:string}) {

    // Note: sendEvent() will send an event (must be registered in Loops)

    const resp: {
        success: boolean;
        id?: string;
        message?: string;
    } = await loops.sendEvent({
        email: email,
        eventName: 'newUser'
    });

    return resp

}
