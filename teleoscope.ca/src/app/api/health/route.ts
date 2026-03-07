export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

function unauthorized() {
    return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
    );
}

export async function GET(request: NextRequest) {
    const auth = request.headers.get('authorization');
    if (!auth) {
        return unauthorized();
    }

    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic' || !encoded) {
        return unauthorized();
    }

    const [user, pass] = Buffer.from(encoded, 'base64')
        .toString('utf-8')
        .split(':');
    if (
        user !== process.env.HEALTH_AUTH_USER ||
        pass !== process.env.HEALTH_AUTH_PASS
    ) {
        return unauthorized();
    }

    return NextResponse.json({
        status: 'OK',
        uptime: process.uptime(),
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
}
