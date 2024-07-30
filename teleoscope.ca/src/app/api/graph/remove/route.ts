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

    // Adding a delay because this is only a cleanup action and some
    // other actions may depend on having the graph item exist for 
    // a few seconds longer. This isn't a great solution and needs
    // to be fixed in future updates.
    const delayDuration = 10000; // 10 seconds

    setTimeout(async () => {
        const result = await dbOp(async (client: MongoClient, db: Db) => {

            const delete_result = await db
                .collection<Graph>('graph')
                .deleteMany({uid: {$in: uids}});
                
            return delete_result
            
        });
        return NextResponse.json(result);
      }, delayDuration);

    return NextResponse.json([]);
    
    
}
