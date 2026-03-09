'use client';

import { useMemo, useState } from 'react';
import { SetOperation, applySetOperation } from '@/lib/setOperations';

type ExampleDoc = {
  id: string;
  label: string;
};

const DOCS: ExampleDoc[] = [
  { id: 'd1', label: 'Wedding budget conflict' },
  { id: 'd2', label: 'Roommate boundary argument' },
  { id: 'd3', label: 'Family holiday disagreement' },
  { id: 'd4', label: 'Coworker schedule issue' },
  { id: 'd5', label: 'Friend trip cancellation' }
];

const OPERATION_OPTIONS: Array<{ value: SetOperation; label: string; formula: string }> = [
  { value: 'union', label: 'Union', formula: 'A ∪ B' },
  { value: 'intersection', label: 'Intersection', formula: 'A ∩ B' },
  { value: 'difference', label: 'Difference', formula: 'A - B' },
  { value: 'exclusion', label: 'Exclusion', formula: 'A △ B' }
];

export default function SetOperationsPlayground() {
  const [setAIds, setSetAIds] = useState<Set<string>>(new Set(['d1', 'd2', 'd3']));
  const [setBIds, setSetBIds] = useState<Set<string>>(new Set(['d2', 'd4']));
  const [operation, setOperation] = useState<SetOperation>('union');

  const result = useMemo(
    () => applySetOperation(operation, setAIds, setBIds),
    [operation, setAIds, setBIds]
  );

  return (
    <div className="my-4 rounded-lg border border-neutral-300 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {OPERATION_OPTIONS.map((op) => (
          <button
            key={op.value}
            onClick={() => setOperation(op.value)}
            className={`rounded px-3 py-1 text-sm ${
              operation === op.value
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
            type="button"
            data-testid={`set-op-${op.value}`}
          >
            {op.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-neutral-600">
        Toggle membership in Set A / Set B, then switch operations to see the output set.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-2 text-left">Document</th>
              <th className="py-2 text-left">Set A</th>
              <th className="py-2 text-left">Set B</th>
              <th className="py-2 text-left">Result ({OPERATION_OPTIONS.find((o) => o.value === operation)?.formula})</th>
            </tr>
          </thead>
          <tbody>
            {DOCS.map((doc) => (
              <tr key={doc.id} className="border-b border-neutral-100">
                <td className="py-2">{doc.label}</td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={setAIds.has(doc.id)}
                    onChange={() => setSetAIds((prev) => toggleSetEntry(prev, doc.id))}
                    aria-label={`Set A includes ${doc.label}`}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={setBIds.has(doc.id)}
                    onChange={() => setSetBIds((prev) => toggleSetEntry(prev, doc.id))}
                    aria-label={`Set B includes ${doc.label}`}
                  />
                </td>
                <td className="py-2">{result.has(doc.id) ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toggleSetEntry(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
