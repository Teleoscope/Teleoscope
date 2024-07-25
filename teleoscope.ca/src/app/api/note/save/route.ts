import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Notes } from '@/types/notes';
import send from '@/lib/amqp';

export async function POST(request: NextRequest) {
    try {
        const { user } = await validateRequest();
        if (!user) {
            return NextResponse.json({ message: 'No user signed in.' }, { status: 401 });
        }

        const req = await request.json();
        const { note_id, content, text }: { note_id: string; content: any; text: string } = req;

        if (!note_id || !content || !text) {
            return NextResponse.json({ message: 'Invalid request data.' }, { status: 400 });
        }

        const result = await dbOp(async (client: MongoClient, db: Db) => {
            const updateResult = await db.collection<Notes>('notes').updateOne(
                { _id: new ObjectId(note_id) },
                {
                    $set: {
                        content: content,
                        text: text
                    }
                }
            );

            send('vectorize_note', {
                note_id: note_id
            });

            return updateResult;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
