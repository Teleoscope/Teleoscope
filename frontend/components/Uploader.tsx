'use client'

import React, { useState } from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';



  

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const [headers, setHeaders] = useState([]);
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


function previewCsv(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const text = event.target.result;
      const lines = text.split('\n').slice(0, 5); // Get first 5 lines
      console.log(lines.join('\n')); // Display in console or update the DOM
      setHeaders(lines[0].split(","))
    };
    reader.readAsText(file);
  }

  
  function previewXlsx(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, {type: 'array', sheetRows: 5});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, {header: 1, range: 0, raw: true}).slice(0, 5);
      console.log(json); // Display in console or update the DOM
      setHeaders(Object.keys(json[0]));
    };
    reader.readAsArrayBuffer(file);
  }

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
    <FormControl fullWidth>
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

      {/* Dropdown for Title */}
      <FormControl fullWidth>
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

      {/* Dropdown for Text */}
      <FormControl fullWidth>
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
    </div>
  );
}
