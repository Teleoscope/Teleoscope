import { useState } from 'react';
import { Button, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip, Typography } from '@mui/material';
import axios from 'axios';
import Table from '@/components/Table';
import { useAppSelector } from '@/lib/hooks';
import { previewFile } from '@/lib/filehandlers';

function Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uniqueId, setUniqueId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [headerLine, setHeaderLine] = useState(1);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);

  const { workflow, workspace } = useAppSelector((state) => state.appState);
  const { _id: workspace_id} = workspace;
  const { settings, _id: workflow_id} = workflow;
  

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
    setHeaderLine(Number(e.target.value));
    if (file) {
      previewFile(file, setHeaders, setPreviewData, Number(e.target.value));
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setError('No file selected for upload.');
      return;
    }
    setError('');
    const data = new FormData();
    data.append('file', file);
    data.append('workflow_id', workflow_id);
    data.append('workspace_id', workspace_id);
    data.append('headerLine_row', headerLine.toString());
    data.append('uid_column', uniqueId);
    data.append('title_column', title);
    data.append('text_column', text);
    data.append('group_columns', selectedHeaders.toString());

    try {
      console.log("File uploading:", data)
          // Log the FormData entries
    for (const pair of data.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    console.log("File uploading:", data)
      const response = await axios.post('/api/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status !== 200) throw new Error(response.statusText);
      setError('');
      alert('File uploaded successfully');
    } catch (error) {
      console.error(error);
      setError('Failed to upload file.');
    }
  };

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <Button variant="contained" component="label" style={{ backgroundColor: settings.color }}>
        Choose File
        <input type="file" hidden onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      </Button>
      {file ? <Typography>{file.name}</Typography> : null}
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
      <Button variant="contained" onClick={uploadFile} disabled={!file} style={{ backgroundColor: settings.color, color: 'white' }}>
        Upload
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
              required={true}
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
              required={true}
              onChange={(e) => setText(e.target.value)}
            >
              {headers.map((header, index) => (
                <MenuItem key={index} value={header}>{header}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Group Data By Columns</InputLabel>
            <Select
              multiple
              value={selectedHeaders}
              onChange={(e) => {
                const { value } = e.target;
                setSelectedHeaders(typeof value === 'string' ? value.split(',') : value as string[]);
              }}
              input={<OutlinedInput label="Header Columns" />}
              renderValue={(selected) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </div>
              )}
            >
              {headers.map((header) => (
                <MenuItem key={header} value={header}>
                  {header}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Table data={previewData} />
        </>
      )}
    </div>
  );
}

export default Uploader;