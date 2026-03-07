import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UploadPage from '@/components/UploadPage';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  mutate: vi.fn(),
  csvPayload: null as unknown,
  appState: {
    appState: {
      workspace: {
        _id: 'workspace-1',
        storage: ['storage-1']
      },
      workflow: {
        settings: {
          color: '#0055ff'
        }
      }
    }
  }
}));

vi.mock('axios', () => ({
  default: {
    post: mocks.axiosPost
  }
}));

vi.mock('swr', () => ({
  mutate: mocks.mutate
}));

vi.mock('@/lib/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mocks.appState)
}));

vi.mock('@/lib/swr', () => ({
  useSWRF: () => ({ data: [] })
}));

vi.mock('@/components/Sidebar/DataViewer', () => ({
  default: ({ id }: { id: string }) => (
    <div data-testid={`storage-item-${id}`}>{id}</div>
  )
}));

vi.mock('next/dynamic', async () => {
  const React = await import('react');

  return {
    default: () => {
      return function MockCSVImporter(props: {
        modalIsOpen: boolean;
        onComplete: (data: unknown) => void;
        modalOnCloseTriggered: () => void;
      }) {
        return React.createElement(
          'div',
          {
            'data-testid': 'csv-importer-mock',
            'data-open': String(props.modalIsOpen)
          },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => props.onComplete(mocks.csvPayload)
            },
            'Complete Mock Import'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => props.modalOnCloseTriggered()
            },
            'Close Mock Importer'
          )
        );
      };
    }
  };
});

describe('UploadPage CSV importer modular behavior', () => {
  beforeEach(() => {
    mocks.axiosPost.mockResolvedValue({ status: 200 });
    mocks.axiosPost.mockClear();
    mocks.mutate.mockClear();
  });

  test('opens importer and uploads one chunk', async () => {
    mocks.csvPayload = {
      columns: [{ key: 'text', name: 'Text' }],
      error: false,
      num_columns: 1,
      num_rows: 2,
      rows: [{ values: { text: 'doc-a' } }, { values: { text: 'doc-b' } }]
    };

    render(<UploadPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open CSV Importer' }));
    expect(screen.getByTestId('csv-importer-mock')).toHaveAttribute(
      'data-open',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete Mock Import' }));

    await waitFor(() => expect(mocks.axiosPost).toHaveBeenCalledTimes(1));

    const [url, body] = mocks.axiosPost.mock.calls[0] as [string, any];
    expect(url).toBe('/api/upload/csv/chunk');
    expect(body.workspace_id).toBe('workspace-1');
    expect(body.data.num_rows).toBe(2);
    expect(body.label).toBeTruthy();

    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1), {
      timeout: 3000
    });
  });

  test('splits completed upload into expected chunk sizes', async () => {
    const rows = Array.from({ length: 1030 }, (_, i) => ({
      values: { text: `doc-${i}` }
    }));

    mocks.csvPayload = {
      columns: [{ key: 'text', name: 'Text' }],
      error: false,
      num_columns: 1,
      num_rows: rows.length,
      rows
    };

    render(<UploadPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open CSV Importer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Mock Import' }));

    await waitFor(() => expect(mocks.axiosPost).toHaveBeenCalledTimes(3));

    const chunkSizes = mocks.axiosPost.mock.calls.map((call) => call[1].data.num_rows);
    expect(chunkSizes).toEqual([512, 512, 6]);
  });

  test('does not upload when importer reports an error', () => {
    mocks.csvPayload = {
      columns: [],
      error: true,
      num_columns: 0,
      num_rows: 0,
      rows: []
    };

    render(<UploadPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Open CSV Importer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Mock Import' }));

    expect(mocks.axiosPost).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
