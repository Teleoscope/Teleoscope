import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const query = request.nextUrl.searchParams.get('query');
    

    // const result = await dbOp(async (client: MongoClient, db: Db) => {
    //     return await db
    //         .collection<Workflows>('workflows')
    //         .findOne({ _id: workflow });
    // });

    return NextResponse.json(0);
}
