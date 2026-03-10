import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Highlighter from '@/components/Highlighter';

const mocks = vi.hoisted(() => ({
  nodes: [] as Array<{ type: string; data?: { query?: string } }>
}));

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      appState: {
        workflow: {
          nodes: mocks.nodes
        }
      }
    })
}));

describe('Highlighter', () => {
  beforeEach(() => {
    mocks.nodes = [];
  });

  test('highlights matching search terms in yellow', () => {
    mocks.nodes = [{ type: 'Search', data: { query: 'signal' } }];

    render(<Highlighter>{'alpha signal beta'}</Highlighter>);

    const highlighted = screen.getByText('signal');
    expect(highlighted).toBeInTheDocument();
    const highlightedSpans = Array.from(document.querySelectorAll('span')).filter((element) =>
      (element.textContent ?? '').includes('signal')
    );
    expect(highlightedSpans.length).toBeGreaterThan(0);
  });

  test('renders plain text when no search query is active', () => {
    render(<Highlighter>{'alpha signal beta'}</Highlighter>);
    expect(screen.getByText('alpha signal beta')).toBeInTheDocument();
  });
});
