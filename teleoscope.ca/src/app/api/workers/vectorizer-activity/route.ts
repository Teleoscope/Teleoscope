export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth';
import { wakeVectorizer } from '@/lib/amqp';

/**
 * Proxies workspace UI activity to the vectorizer control server so the embedding
 * model loads and the RabbitMQ consumer runs while someone is in a workspace.
 */
export async function POST() {
  const { user } = await validateRequest();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const queueWakeOk = await wakeVectorizer(null);

  const base = process.env.VECTORIZER_CONTROL_URL?.trim();
  if (!base) {
    return new NextResponse(null, { status: queueWakeOk ? 204 : 503 });
  }

  const url = `${base.replace(/\/$/, '')}/activity`;
  const token = process.env.VECTORIZER_CONTROL_TOKEN?.trim();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, { method: 'POST', headers, signal: ac.signal });
    if (!res.ok) {
      if (queueWakeOk) {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json(
        { message: `Vectorizer control returned ${res.status}` },
        { status: 502 }
      );
    }
  } catch {
    if (queueWakeOk) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(
      { message: 'Vectorizer control unreachable' },
      { status: 503 }
    );
  } finally {
    clearTimeout(t);
  }

  return new NextResponse(null, { status: 204 });
}
