'use client';

import { useState } from 'react';
import { Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { previewFile } from '@/lib/filehandlers';

interface FileInputProps {
  setFile: (file: File | null) => void;
  setHeaders: (headers: string[]) => void;
  setPreviewData: (data: any[]) => void;
  headerLine: number;
  setHeaderLine: (headerLine: number) => void;
  settingsColor: string;
}

export default function FileInput({ setFile, setHeaders, setPreviewData, headerLine, setHeaderLine, settingsColor }: FileInputProps) {
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (!newFile) {
      setError('No file selected.');
      return;
    }
    setFile(newFile);
    setError('');
    previewFile(newFile, setHeaders, setPreviewData, headerLine);
  };

  const handleHeaderChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const newHeaderLine = Number(e.target.value);
    setHeaderLine(newHeaderLine);
    if (newHeaderLine && newFile) {
      previewFile(newFile, setHeaders, setPreviewData, newHeaderLine);
    }
  };

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <Button variant="contained" component="label" style={{ backgroundColor: settingsColor }}>
        Choose File
        <input type="file" hidden onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      </Button>
      <FormControl fullWidth margin="normal">
        <InputLabel>Header Line</InputLabel>
        <Select
          value={headerLine}
          label="Header Line"
          onChange={handleHeaderChange}
        >
          {[...Array(10).keys()].map(line => (
            <MenuItem key={line} value={line + 1}>{line + 1}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
