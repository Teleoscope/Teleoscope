import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

export type UploadRow = {
  values: {
    text: string;
    title: string;
    id: string;
    group: string;
  };
};

function samplePath(sampleSize: number): string {
  return path.resolve(__dirname, `../../../data/sample_${sampleSize}.csv`);
}

export async function readSampleUploadRows(sampleSize: number): Promise<UploadRow[]> {
  const csvPath = samplePath(sampleSize);
  const csv = await fs.readFile(csvPath, 'utf8');
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      `Failed to parse sample_${sampleSize}.csv: ${parsed.errors.map((e) => e.message).join('; ')}`
    );
  }

  const rows = parsed.data
    .filter((row) => typeof row.text === 'string' && row.text.trim().length > 0)
    .map((row, index) => ({
      values: {
        text: row.text!,
        title: row.title?.trim() || `Sample Document ${index + 1}`,
        id: row.id?.trim() || `sample-${sampleSize}-${index + 1}`,
        // Deterministic groups so UI/API grouping and set operations are always testable.
        group: index % 2 === 0 ? 'sample-group-a' : 'sample-group-b'
      }
    }));

  if (rows.length === 0) {
    throw new Error(`No rows found in sample_${sampleSize}.csv`);
  }

  return rows;
}

export function chunkRows<T>(rows: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function copySampleCsvTo(testOutputPath: string, sampleSize: number): Promise<string> {
  const source = samplePath(sampleSize);
  await fs.copyFile(source, testOutputPath);
  return testOutputPath;
}
