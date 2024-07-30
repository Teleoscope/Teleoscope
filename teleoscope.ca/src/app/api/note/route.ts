import { validateRequest } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Graph } from '@/types/graph';

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const note = request.nextUrl.searchParams.get('note');
    const uid = request.nextUrl.searchParams.get('uid');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        let oid;
        if (uid && !note) {
            const graph_item = await db
            .collection<Graph>('graph')
            .findOne({uid: uid})
            oid = graph_item?.reference
        } else if (note) {
            oid = new ObjectId(note)
        } else {
            throw Error(`No oid or uid given for note ${request}.`)
        }

        return await db
            .collection('notes')
            .findOne({_id: oid})
    });

    return Response.json(result);
}
