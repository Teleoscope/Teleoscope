import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { Groups } from '@/types/groups';


export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { group }: { group: Groups } = req;


    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const new_group: Groups = {
            color: group.color,
            docs: group.docs.map(doc => new ObjectId(doc)),
            label: group.label,
            workspace: new ObjectId(group.workspace)
        }
        return await db.collection("groups").insertOne(new_group)
    });
    return NextResponse.json(result);
}
