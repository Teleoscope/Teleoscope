import { describe, expect, it } from 'vitest';
import { DEMO_POSTS, DEMO_SET_TAGS, generateDemoPosts } from '@/lib/demoData';

describe('demo data generation', () => {
  it('builds exactly 1000 deterministic posts', () => {
    const posts = generateDemoPosts(1000);
    expect(posts).toHaveLength(1000);
    expect(posts[0].id).toBe('demo-post-0001');
    expect(posts[999].id).toBe('demo-post-1000');
  });

  it('contains required post fields and tags', () => {
    const first = DEMO_POSTS[0];
    expect(first.title.toLowerCase()).toContain('aita');
    expect(first.text.length).toBeGreaterThan(80);
    expect(first.tags.length).toBe(2);
    expect(DEMO_SET_TAGS).toContain(first.tags[0]);
    expect(DEMO_SET_TAGS).toContain(first.tags[1]);
  });
});
