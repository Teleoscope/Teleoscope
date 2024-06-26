import { validateRequest } from '@/lib/auth';
import { client } from '@/lib/db';
import { Teams } from '@/types/teams';
import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const mongo_client = await client()
    const db = mongo_client.db()
    
    const { user, session } = await validateRequest()

    const result = await db.collection("teams").find({
        $or: [
            { "owner": user?.id },
            {
                "users": {
                    $elemMatch: {
                        "permissions.read": true,
                        "_id": user
                    }
                }
            }
        ]
    }).toArray();

    return Response.json(result);
}

export async function POST(request: NextRequest) {
    const mongo_client = await client()
    const db = mongo_client.db()
    
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

    const result = await db.collection('teams').insertOne(team);
    mongo_client.close()
    return Response.json(result);
}
