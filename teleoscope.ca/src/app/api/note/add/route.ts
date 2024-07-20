import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { newNote } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { workspace_id, label }: { workspace_id: string, label: string } = req;

    const note = newNote(workspace_id, label)
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection("notes").insertOne(note)
    });
    return NextResponse.json(result);
}
