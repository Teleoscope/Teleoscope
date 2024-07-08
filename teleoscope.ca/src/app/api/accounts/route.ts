import { validateRequest } from '@/lib/auth';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest();
    if (!user) {
        return Response.json('No user signed in.');
    }

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('accounts')
            .find({
                $or: [
                    { 'users.owner': user.id },
                    {
                        'users.admins': {
                            $elemMatch: {
                                'permission.write': true,
                                _id: user.id
                            }
                        }
                    }
                ]
            })
            .toArray();
    });

    return Response.json(result);
}
