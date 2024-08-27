// app/api/upload/route.js
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import send from '@/lib/amqp';

const MONGODB_DATABASE = process.env.MONGODB_DATABASE!;

export const POST = async (request: NextRequest) => {
    const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const req = await request.json();
    const { workspace_id, data, label } = req;

    send('chunk_upload', {
        database: MONGODB_DATABASE,
        userid: user.id,
        workspace: workspace_id,
        data: data,
        label
    });

    return NextResponse.json({ status: 'success' });
};
