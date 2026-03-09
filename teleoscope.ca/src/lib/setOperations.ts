export type SetOperation = 'union' | 'intersection' | 'difference' | 'exclusion';

export function union(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a, ...b]);
}

export function intersection(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter((item) => b.has(item)));
}

export function difference(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter((item) => !b.has(item)));
}

export function exclusion(a: Set<string>, b: Set<string>): Set<string> {
  const onlyA = difference(a, b);
  const onlyB = difference(b, a);
  return union(onlyA, onlyB);
}

export function applySetOperation(
  op: SetOperation,
  source: Set<string>,
  control: Set<string>
): Set<string> {
  switch (op) {
    case 'union':
      return union(source, control);
    case 'intersection':
      return intersection(source, control);
    case 'difference':
      return difference(source, control);
    case 'exclusion':
      return exclusion(source, control);
    default:
      return new Set<string>();
  }
}
