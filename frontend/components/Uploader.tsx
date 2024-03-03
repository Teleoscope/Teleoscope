'use client'

import { useState } from 'react';

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

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          type="file"
          name="file"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile && validateFile(selectedFile)) {
              setFile(selectedFile);
            } else {
              setFile(null); // Reset file if not valid
            }
          }}
        />
        <input type="submit" value="Upload" />
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
