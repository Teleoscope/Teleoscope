'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoPost, DemoSetTag, DEMO_SET_TAGS } from '@/lib/demoData';
import { SetOperation, applySetOperation } from '@/lib/setOperations';

type DemoResponse = {
  total: number;
  filtered: number;
  offset: number;
  limit: number;
  available_tags: string[];
  posts: DemoPost[];
};

const OPERATIONS: Array<{ value: SetOperation; label: string }> = [
  { value: 'union', label: 'Union' },
  { value: 'intersection', label: 'Intersection' },
  { value: 'difference', label: 'Difference (A - B)' },
  { value: 'exclusion', label: 'Exclusion (A △ B)' }
];

function tagLabel(tag: string): string {
  const [kind, value] = tag.split(':');
  if (!value) {
    return tag;
  }
  const prefix = kind === 'topic' ? 'Topic' : 'Verdict';
  return `${prefix}: ${value.toUpperCase()}`;
}

export default function DemoWorkspace() {
  const [posts, setPosts] = useState<DemoPost[]>([]);
  const [query, setQuery] = useState('');
  const [sourceTag, setSourceTag] = useState<DemoSetTag>('topic:family');
  const [controlTag, setControlTag] = useState<DemoSetTag>('verdict:nta');
  const [operation, setOperation] = useState<SetOperation>('intersection');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/demo/posts?limit=1000', {
          method: 'GET',
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error(`Unable to load demo posts (${response.status}).`);
        }
        const body: DemoResponse = await response.json();
        if (!cancelled) {
          setPosts(body.posts);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load demo posts.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceSet = useMemo(
    () => new Set(posts.filter((post) => post.tags.includes(sourceTag)).map((post) => post.id)),
    [posts, sourceTag]
  );
  const controlSet = useMemo(
    () => new Set(posts.filter((post) => post.tags.includes(controlTag)).map((post) => post.id)),
    [posts, controlTag]
  );
  const resultSet = useMemo(
    () => applySetOperation(operation, sourceSet, controlSet),
    [operation, sourceSet, controlSet]
  );

  const queryNormalized = query.trim().toLowerCase();
  const resultPosts = useMemo(() => {
    return posts
      .filter((post) => resultSet.has(post.id))
      .filter((post) => {
        if (!queryNormalized) {
          return true;
        }
        return (
          post.title.toLowerCase().includes(queryNormalized) ||
          post.text.toLowerCase().includes(queryNormalized)
        );
      });
  }, [posts, queryNormalized, resultSet]);

  const visiblePosts = resultPosts.slice(0, 20);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-neutral-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Public Demo Workspace</h1>
        <p className="mt-2 text-neutral-600">
          No login required. This dataset includes 1000 baked-in reddit-style posts.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard label="Dataset size" value={posts.length.toString()} testId="demo-total-count" />
        <MetricCard label="Set A size" value={sourceSet.size.toString()} />
        <MetricCard label="Set B size" value={controlSet.size.toString()} />
        <MetricCard label="Result size" value={resultPosts.length.toString()} testId="demo-result-count" />
      </section>

      <section className="mt-6 rounded border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-xl font-semibold">Interactive Set Operations</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Set A</span>
            <select
              value={sourceTag}
              onChange={(event) => setSourceTag(event.target.value as DemoSetTag)}
              className="rounded border border-neutral-300 px-2 py-2"
              data-testid="demo-source-tag"
            >
              {DEMO_SET_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tagLabel(tag)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Set B</span>
            <select
              value={controlTag}
              onChange={(event) => setControlTag(event.target.value as DemoSetTag)}
              className="rounded border border-neutral-300 px-2 py-2"
              data-testid="demo-control-tag"
            >
              {DEMO_SET_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tagLabel(tag)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Operation</span>
            <select
              value={operation}
              onChange={(event) => setOperation(event.target.value as SetOperation)}
              className="rounded border border-neutral-300 px-2 py-2"
              data-testid="demo-operation"
            >
              {OPERATIONS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Search in result set</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. wedding, roommate..."
              className="rounded border border-neutral-300 px-3 py-2"
              data-testid="demo-search"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 rounded border border-neutral-200 bg-white p-4">
        <h3 className="text-lg font-semibold">Result sample (first 20)</h3>
        {loading ? (
          <p className="mt-2 text-neutral-600">Loading demo posts…</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-red-600" data-testid="demo-error">
            {error}
          </p>
        ) : null}
        {!loading && !error && visiblePosts.length === 0 ? (
          <p className="mt-2 text-neutral-600">No matching posts for this combination.</p>
        ) : null}
        <ul className="mt-3 space-y-2">
          {visiblePosts.map((post) => (
            <li
              key={post.id}
              className="rounded border border-neutral-200 p-3"
              data-testid="demo-post-row"
            >
              <p className="font-medium">{post.title}</p>
              <p className="mt-1 text-sm text-neutral-600">
                r/{post.subreddit} · u/{post.author} · score {post.score}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-neutral-700">{post.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
