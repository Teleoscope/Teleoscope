import { validateRequest } from '@/lib/auth';
import { Documents } from '@/types/documents';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
export async function GET(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const query = request.nextUrl.searchParams.get('query');

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection<Documents>('documents')
            .countDocuments({ $text: { $search: query } })
    });

    return NextResponse.json(result);
}
