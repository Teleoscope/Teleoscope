import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { Graph } from '@/types/graph';


export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }
    const { uids } = await request.json()
    
    const result = await dbOp(async (client: MongoClient, db: Db) => {

        
        const delete_result = await db
            .collection<Graph>('graph')
            .deleteMany({uid: {$in: uids}});
            
        return delete_result
        
    });
    return NextResponse.json(result);
}
