import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const {
        workspace_id,
        group_ids,
        storage_ids
    }: { workspace_id: string; userid: string; group_ids: [string]; storage_ids: [string] } = req;

    send('generate_docx', {
        workspace_id: workspace_id,
        userid: user.id,
        group_ids: group_ids,
        storage_ids: storage_ids
    });

    return NextResponse.json({msg: 
        "sent generate_docx task"
    });
}
