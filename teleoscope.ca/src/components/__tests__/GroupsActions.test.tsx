import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveDocxAction, SaveXLSXAction } from '@/components/Groups/GroupsActions';
import { describe, expect, test, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}));

vi.mock('@/lib/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      appState: {
        workspace: {
          _id: 'workspace-123'
        }
      }
    })
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.get,
    post: mocks.post
  }
}));

describe('Groups export buttons', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.get.mockResolvedValue({ data: ['group-a', 'group-b'] });
    mocks.post.mockResolvedValue({ status: 200 });
  });

  test('DOCX export button sends expected API payload', async () => {
    render(<SaveDocxAction />);
    await userEvent.click(screen.getByRole('button', { name: 'Download as Docx' }));

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(mocks.get).toHaveBeenCalledWith('/api/groups?workspace=workspace-123&ids=true');
    expect(mocks.post).toHaveBeenCalledWith('/api/download/prepare/docx', {
      workspace_id: 'workspace-123',
      group_ids: ['group-a', 'group-b'],
      storage_ids: []
    });
  });

  test('XLSX export button sends expected API payload', async () => {
    render(<SaveXLSXAction />);
    await userEvent.click(screen.getByRole('button', { name: 'Download as XLSX' }));

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(mocks.get).toHaveBeenCalledWith('/api/groups?workspace=workspace-123&ids=true');
    expect(mocks.post).toHaveBeenCalledWith('/api/download/prepare/xlsx', {
      workspace_id: 'workspace-123',
      group_ids: ['group-a', 'group-b'],
      storage_ids: []
    });
  });
});
