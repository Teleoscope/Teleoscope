export const dynamic = 'force-dynamic';
import { DEMO_POSTS, DEMO_SET_TAGS, DemoSetTag } from '@/lib/demoData';
import { NextRequest, NextResponse } from 'next/server';

const SEARCH_INDEX = DEMO_POSTS.map((post) => ({
  post,
  searchable: `${post.title}\n${post.text}`.toLowerCase()
}));
const TAG_INDEX = buildTagIndex();

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

function buildTagIndex(): Record<DemoSetTag, typeof DEMO_POSTS> {
  const index = {} as Record<DemoSetTag, typeof DEMO_POSTS>;
  for (const tag of DEMO_SET_TAGS) {
    index[tag] = DEMO_POSTS.filter((post) => post.tags.includes(tag));
  }
  return index;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const offset = Math.max(0, toInt(request.nextUrl.searchParams.get('offset'), 0));
  const limit = Math.min(
    2000,
    Math.max(1, toInt(request.nextUrl.searchParams.get('limit'), 50))
  );
  const tag = request.nextUrl.searchParams.get('tag');
  const tagFilter = tag as DemoSetTag | null;

  let filtered = DEMO_POSTS;

  if (tagFilter && DEMO_SET_TAGS.includes(tagFilter)) {
    filtered = TAG_INDEX[tagFilter];
  }

  if (q.length > 0) {
    filtered = SEARCH_INDEX
      .filter(({ searchable, post }) => {
        if (!searchable.includes(q)) {
          return false;
        }
        if (!tagFilter || !DEMO_SET_TAGS.includes(tagFilter)) {
          return true;
        }
        return post.tags.includes(tagFilter);
      })
      .map(({ post }) => post);
  }

  const page = filtered.slice(offset, offset + limit);

  return NextResponse.json(
    {
      total: DEMO_POSTS.length,
      filtered: filtered.length,
      offset,
      limit,
      available_tags: DEMO_SET_TAGS,
      posts: page
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
      }
    }
  );
}
