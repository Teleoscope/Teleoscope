import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentActions } from '@/components/Documents/DocumentActions';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  makeDocx: vi.fn(),
  writeFile: vi.fn(),
  jsonToSheet: vi.fn(() => ({ sheet: true })),
  bookNew: vi.fn(() => ({ workbook: true })),
  appendSheet: vi.fn(),
  clipboardWriteText: vi.fn(),
  open: vi.fn()
}));

vi.mock('@/components/DocxMaker', () => ({
  MakeDocx: mocks.makeDocx
}));

vi.mock('@/components/Groups/GroupSelector', () => ({
  default: () => <button aria-label="Group selector mock" />
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mocks.jsonToSheet,
    book_new: mocks.bookNew,
    book_append_sheet: mocks.appendSheet
  },
  writeFile: mocks.writeFile
}));

describe('Document action buttons', () => {
  const sampleDocument = {
    _id: 'doc-1',
    title: 'Sample Document',
    text: 'Sample text body',
    metadata: {
      url: 'https://example.com/url',
      source_url: 'https://example.com/source'
    }
  };

  beforeEach(() => {
    mocks.makeDocx.mockReset();
    mocks.writeFile.mockReset();
    mocks.jsonToSheet.mockClear();
    mocks.bookNew.mockClear();
    mocks.appendSheet.mockClear();
    mocks.clipboardWriteText.mockReset();
    mocks.open.mockReset();

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mocks.clipboardWriteText },
      configurable: true
    });
    Object.defineProperty(window, 'open', {
      value: mocks.open,
      configurable: true
    });
  });

  test('export buttons trigger docx/xlsx generation', async () => {
    render(<DocumentActions document={sampleDocument} />);

    await userEvent.click(screen.getByRole('button', { name: 'Download as Docx' }));
    expect(mocks.makeDocx).toHaveBeenCalledTimes(1);
    expect(mocks.makeDocx).toHaveBeenCalledWith({
      tag: 'Document',
      title: 'Sample Document',
      groups: [
        {
          label: 'Single document',
          documents: [sampleDocument]
        }
      ]
    });

    await userEvent.click(screen.getByRole('button', { name: 'Download as XLSX' }));
    expect(mocks.jsonToSheet).toHaveBeenCalledTimes(1);
    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
  });

  test('copy and link buttons use current document payload', async () => {
    render(<DocumentActions document={sampleDocument} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy metadata to clipboard' }));
    expect(mocks.clipboardWriteText).toHaveBeenCalledTimes(1);
    expect(mocks.clipboardWriteText.mock.calls[0][0]).toContain('Sample Document');

    await userEvent.click(screen.getByRole('button', { name: 'Copy text to clipboard' }));
    expect(mocks.clipboardWriteText).toHaveBeenCalledTimes(2);
    expect(mocks.clipboardWriteText.mock.calls[1][0]).toContain('Sample text body');

    await userEvent.click(screen.getByRole('button', { name: 'Open URL in new window' }));
    expect(mocks.open).toHaveBeenCalledWith('https://example.com/url', '_blank');
    expect(mocks.open).toHaveBeenCalledWith('https://example.com/source', '_blank');
  });
});
