import { client } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const db = (await client()).db();

    const email = request.nextUrl.searchParams.get('email');
    if (!email) {
        return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const result = await db.collection('users').findOne({
        emails: email
    });

    const exists = !!result;

    return NextResponse.json({ exists });
}

export async function POST(request: NextRequest) {
    const mongo_client = await client();
    const session = mongo_client.startSession();

    const db = mongo_client.db();

    const formData = await request.formData();

    const email = formData.get('email')?.toString();
    const teamId = formData.get('teamId')?.toString();

    if (!email || !teamId) {
        return NextResponse.json({ error: 'Email and teamId are required' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({
        emails: email
    });

    if (!user) {
        return NextResponse.json({ error: "Email doesn't correspond to a user" }, { status: 404 });
    }


    const teamObjectId = new ObjectId(teamId);
    const team = await db.collection('teams').findOne({
        _id: teamObjectId
    })

    if (!team) {
        return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    const account = await db.collection('accounts').findOne({
        _id: team.account
    })

    if (!account) {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    if (account.amount_seats_used >= account.amount_seats_available) {
        return NextResponse.json({ error: 'Too many seats used.' }, { status: 404 });
    }


    session.startTransaction();

    const team_result = await db.collection('teams').updateOne(
        {
            _id: teamObjectId
        },
        {
            $push: {
                users: {
                    _id: user._id,
                    permissions: {
                        read: true
                    }
                }
            } as any // Explicitly cast to any to satisfy TypeScript
        }, {
            session
        }
    );

    const account_result = await db.collection('accounts').updateOne(
        {
            _id: account._id
        },
        {
            "resources.amount_seats_used": account.resources.amount_seats_used + 1
        }, {
            session
        }
    );

    if (team_result.modifiedCount === 0) {
        return NextResponse.json({ error: 'Team not found or user already added' }, { status: 404 });
    }

    if (account_result.modifiedCount === 0) {
        return NextResponse.json({ error: 'Could not update account' }, { status: 404 });
    }


    await session.commitTransaction();

    return NextResponse.json({ success: true });
}
