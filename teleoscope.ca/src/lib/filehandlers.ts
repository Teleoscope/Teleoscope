
import { read, utils } from 'xlsx';

export function previewXlsx(file: File, setHeaders: (headers: string[]) => void, setPreviewData: (data: any[]) => void, headerLine = 1) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const data = new Uint8Array(event.target!.result as ArrayBuffer);
    const workbook = read(data, { type: 'array', sheetRows: headerLine + 4 });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = utils.sheet_to_json(worksheet, { header: 1, range: headerLine - 1 }).slice(0, 5);
    setHeaders(json[0]);
    setPreviewData(json);
  };
  reader.readAsArrayBuffer(file);
}

export function previewCsv(file: File, setHeaders: (headers: string[]) => void, setPreviewData: (data: any[]) => void, headerLine = 1) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const text = event.target!.result as string;
    const lines = text.split('\n').slice(headerLine - 1);
    const headers = lines[0].split(',').map(header => header.trim());
    const json = lines.slice(0, 5).map(line => line.split(',').map(cell => cell.trim()));
    setHeaders(headers);
    setPreviewData(json);
  };
  reader.readAsText(file);
}

export function previewFile(file: File, setHeaders: (headers: string[]) => void, setPreviewData: (data: any[]) => void, headerLine = 1) {
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    previewCsv(file, setHeaders, setPreviewData, headerLine);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
    previewXlsx(file, setHeaders, setPreviewData, headerLine);
  }
}
