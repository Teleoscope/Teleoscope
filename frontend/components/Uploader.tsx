'use client'

import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { read, utils } from "xlsx";
import Table from '@/components/Table';

function previewXlsx(file, setHeaders, setPreviewData, headerLine = 1) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = read(data, {type: 'array', sheetRows: 5});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = utils.sheet_to_json(worksheet, {header: 1, range: headerLine - 1, raw: true}).slice(0, 5);
      setHeaders(json[0]);
      setPreviewData(json)
      console.log(json); // Display in console or update the DOM

    };
    reader.readAsArrayBuffer(file);
  }

function previewCsv(file, setHeaders, setPreviewData, headerLine = 1) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[headerLine - 1].split(',').map(header => header.trim()); // Assume first line is headers
      const json = lines.map(l => l.split(","))
      setHeaders(headers); // Update state with headers for dropdown
      setPreviewData(json)
      console.log(json); // Display in console or update the DOM

    };
    reader.readAsText(file);
  }
  

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const [headers, setHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [uniqueId, setUniqueId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

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


  const handleFileChange = (e) => {
    const newFile = e.target.files?.[0];
    setFile(newFile);

    if (!newFile) return;

    if (newFile.type === 'text/csv') {
      previewCsv(newFile, setHeaders, setPreviewData);
    } else if (newFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      previewXlsx(newFile, setHeaders, setPreviewData);
    }
  };

  return (
    <div>
      <Button
        variant="contained"
        component="label"
      >
        Upload File
        <input
          type="file"
          hidden
          onChange={handleFileChange}
          accept=".csv"
        />
      </Button>

      {headers.length > 0 && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel>Unique ID</InputLabel>
            <Select
              value={uniqueId}
              label="Unique ID"
              onChange={(e) => setUniqueId(e.target.value)}
            >
              {headers.map((header, index) => (
                <MenuItem key={index} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Title</InputLabel>
            <Select
              value={title}
              label="Title"
              onChange={(e) => setTitle(e.target.value)}
            >
              {headers.map((header, index) => (
                <MenuItem key={index} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Text</InputLabel>
            <Select
              value={text}
              label="Text"
              onChange={(e) => setText(e.target.value)}
            >
              {headers.map((header, index) => (
                <MenuItem key={index} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}
      <Table data={previewData} />
    </div>
  );
}
