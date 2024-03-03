'use client'

import { useState } from 'react';



function previewCsv(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const text = event.target.result;
      const lines = text.split('\n').slice(0, 5); // Get first 5 lines
      console.log(lines.join('\n')); // Display in console or update the DOM
    };
    reader.readAsText(file);
  }

  
  function previewXlsx(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, {header: 1, range: 0, raw: true}).slice(0, 5);
      console.log(json); // Display in console or update the DOM
    };
    reader.readAsArrayBuffer(file);
  }
  

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (!validTypes.includes(file.type)) {
      setError('File must be a .xlsx or .csv file');
      return false;
    }
    setError('');
    return true;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError('No file selected');
      return;
    }

    if (!validateFile(file)) return; // Validate file type

    try {
      const data = new FormData();
      data.set('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error(await res.text());
      setError(''); // Clear error on successful upload
    } catch (e: any) {
      console.error(e);
      setError(e.message); // Set error from catch block
    }
  };


  const onChange = (e) => {
    const newFile = e.target.files?.[0];
    setFile(newFile);

    if (!newFile) return;

    if (newFile.type === 'text/csv') {
      previewCsv(newFile);
    } else if (newFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      previewXlsx(newFile);
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          type="file"
          name="file"
          onChange={onChange}
        />
        <input type="submit" value="Upload" />
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
