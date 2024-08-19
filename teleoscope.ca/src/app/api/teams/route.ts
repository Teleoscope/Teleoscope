import { validateRequest } from '@/lib/auth';
import { Teams } from '@/types/teams';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
    const { user, session } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db
            .collection('teams')
            .find({
                $or: [
                    { owner: user?.id },
                    {
                        users: {
                            $elemMatch: {
                                'permissions.read': true,
                                _id: user
                            }
                        }
                    }
                ]
            })
            .toArray();
    });

    return Response.json(result);
}

export async function POST(request: NextRequest) {
    const formData = await request.formData();

    const owner_id = formData.get('owner')?.toString()!;
    const account_id = new ObjectId(formData.get('account')?.toString()!);
    const label = formData.get('label')?.toString()!;

    const team: Teams = {
        account: account_id,
        owner: owner_id,
        label: label,
        workspaces: [],
        users: []
    };

    const result = await dbOp(async (client: MongoClient, db: Db) => {
        return await db.collection('teams').insertOne(team);
    });
    return Response.json(result);
}
