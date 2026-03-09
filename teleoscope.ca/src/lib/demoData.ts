export type DemoSetTag =
  | 'topic:finances'
  | 'topic:family'
  | 'topic:wedding'
  | 'topic:roommates'
  | 'topic:work'
  | 'topic:friends'
  | 'topic:school'
  | 'topic:travel'
  | 'topic:parenting'
  | 'topic:boundaries'
  | 'verdict:nta'
  | 'verdict:yta'
  | 'verdict:esh'
  | 'verdict:nah';

export type DemoPost = {
  id: string;
  title: string;
  text: string;
  subreddit: string;
  author: string;
  created_utc: string;
  score: number;
  tags: DemoSetTag[];
};

const SUBREDDITS = ['AmItheAsshole', 'relationships', 'TrueOffMyChest'];
const PEOPLE = [
  'my sister',
  'my brother',
  'my partner',
  'my roommate',
  'my manager',
  'my coworker',
  'my friend',
  'my parent',
  'my in-laws',
  'my teammate'
];
const TOPICS: Array<{
  tag: DemoSetTag;
  noun: string;
  action: string;
  consequence: string;
}> = [
  {
    tag: 'topic:finances',
    noun: 'money',
    action: 'refusing to split a surprise expense',
    consequence: 'the group chat blew up overnight'
  },
  {
    tag: 'topic:family',
    noun: 'family visit',
    action: 'ending a holiday argument early',
    consequence: 'everyone says I ruined the week'
  },
  {
    tag: 'topic:wedding',
    noun: 'wedding planning',
    action: 'declining to be in a wedding party',
    consequence: 'I was removed from every planning thread'
  },
  {
    tag: 'topic:roommates',
    noun: 'apartment chores',
    action: 'setting a quiet-hours rule',
    consequence: 'my roommate called me controlling'
  },
  {
    tag: 'topic:work',
    noun: 'office policy',
    action: 'reporting repeated schedule changes',
    consequence: 'my team says I made things awkward'
  },
  {
    tag: 'topic:friends',
    noun: 'friend group plans',
    action: 'backing out of a birthday trip',
    consequence: 'I got labeled unreliable'
  },
  {
    tag: 'topic:school',
    noun: 'class project',
    action: 'asking for equal workload',
    consequence: 'my classmates stopped responding'
  },
  {
    tag: 'topic:travel',
    noun: 'vacation planning',
    action: 'booking a separate hotel room',
    consequence: 'people said I was selfish'
  },
  {
    tag: 'topic:parenting',
    noun: 'childcare routine',
    action: 'keeping our normal bedtime while visiting relatives',
    consequence: 'my family said I was inflexible'
  },
  {
    tag: 'topic:boundaries',
    noun: 'personal boundaries',
    action: 'not sharing private messages',
    consequence: 'now everyone says I am hiding things'
  }
];
const VERDICTS: Array<{
  tag: DemoSetTag;
  label: string;
}> = [
  { tag: 'verdict:nta', label: 'NTA' },
  { tag: 'verdict:yta', label: 'YTA' },
  { tag: 'verdict:esh', label: 'ESH' },
  { tag: 'verdict:nah', label: 'NAH' }
];

const DAY_IN_SECONDS = 24 * 60 * 60;

function pad(n: number): string {
  return n.toString().padStart(4, '0');
}

function pick<T>(arr: T[], index: number, salt = 0): T {
  const value = (index * 37 + salt * 17) % arr.length;
  return arr[value];
}

function makeTitle(index: number, topic: (typeof TOPICS)[number], person: string): string {
  return `AITA for ${topic.action} with ${person}? (${index + 1})`;
}

function makeBody(
  index: number,
  topic: (typeof TOPICS)[number],
  person: string,
  verdict: (typeof VERDICTS)[number]
): string {
  const timeline = index % 2 === 0 ? 'last weekend' : 'yesterday';
  const detail =
    index % 3 === 0
      ? 'I tried to discuss it calmly before making a decision.'
      : 'I explained my reasons but they said I was overreacting.';

  return [
    `Throwaway because people in ${topic.noun} know my main account.`,
    '',
    `${timeline}, I was dealing with ${person} around ${topic.noun}.`,
    `I ended up ${topic.action}. ${detail}`,
    `Afterward, ${topic.consequence}.`,
    '',
    `Extra context: I am sharing only the original post details (no comments), and my friends are split between ${verdict.label} and "just apologize".`,
    '',
    'AITA?'
  ].join('\n');
}

export function generateDemoPosts(count = 1000): DemoPost[] {
  const posts: DemoPost[] = [];
  const startEpoch = 1_704_067_200; // 2024-01-01 UTC

  for (let i = 0; i < count; i += 1) {
    const topic = pick(TOPICS, i, 1);
    const person = pick(PEOPLE, i, 2);
    const verdict = pick(VERDICTS, i, 3);
    const created = new Date((startEpoch + i * DAY_IN_SECONDS) * 1000).toISOString();
    const score = 20 + ((i * 19) % 7000);

    posts.push({
      id: `demo-post-${pad(i + 1)}`,
      title: makeTitle(i, topic, person),
      text: makeBody(i, topic, person, verdict),
      subreddit: pick(SUBREDDITS, i, 4),
      author: `user_${((i * 11) % 997) + 1}`,
      created_utc: created,
      score,
      tags: [topic.tag, verdict.tag]
    });
  }

  return posts;
}

export const DEMO_POSTS = generateDemoPosts(1000);
export const DEMO_SET_TAGS: DemoSetTag[] = [
  'topic:finances',
  'topic:family',
  'topic:wedding',
  'topic:roommates',
  'topic:work',
  'topic:friends',
  'topic:school',
  'topic:travel',
  'topic:parenting',
  'topic:boundaries',
  'verdict:nta',
  'verdict:yta',
  'verdict:esh',
  'verdict:nah'
];
