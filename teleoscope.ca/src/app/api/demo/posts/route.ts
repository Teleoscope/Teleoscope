export const dynamic = 'force-dynamic';
import { DEMO_POSTS, DEMO_SET_TAGS, DemoSetTag } from '@/lib/demoData';
import { NextRequest, NextResponse } from 'next/server';

function toInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const offset = Math.max(0, toInt(request.nextUrl.searchParams.get('offset'), 0));
  const limit = Math.min(
    2000,
    Math.max(1, toInt(request.nextUrl.searchParams.get('limit'), 50))
  );
  const tag = request.nextUrl.searchParams.get('tag');

  const filtered = DEMO_POSTS.filter((post) => {
    const matchesQuery =
      q.length === 0 ||
      post.title.toLowerCase().includes(q) ||
      post.text.toLowerCase().includes(q);
    const matchesTag = !tag || post.tags.includes(tag as DemoSetTag);
    return matchesQuery && matchesTag;
  });

  const page = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    total: DEMO_POSTS.length,
    filtered: filtered.length,
    offset,
    limit,
    available_tags: DEMO_SET_TAGS,
    posts: page
  });
}
