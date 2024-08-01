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
  const [uploadProgress, setUploadProgress] = useState(0);

  const { workflow, workspace } = useAppSelector((state) => state.appState);
  const { _id: workspace_id } = workspace;
  const { settings, _id: workflow_id } = workflow;

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
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('fileName', file.name);
      formData.append('totalChunks', totalChunks.toString());
      formData.append('currentChunkIndex', chunkIndex.toString());
      formData.append('workflow_id', workflow_id);
      formData.append('workspace_id', workspace_id);
      formData.append('headerLine_row', headerLine.toString());
      formData.append('uid_column', uniqueId);
      formData.append('title_column', title);
      formData.append('text_column', text);
      formData.append('group_columns', selectedHeaders.toString());

      try {
        await axios.post('/api/upload/csv', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              ((chunkIndex * CHUNK_SIZE + progressEvent.loaded) * 100) / file.size
            );
            setUploadProgress(percentCompleted);
          },
        });
      } catch (error) {
        console.error('Upload error:', error);
        setError('Failed to upload file.');
        break;
      }
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
      <div>
        <Typography variant="h6">Upload Progress</Typography>
        <progress value={uploadProgress} max="100">{uploadProgress}%</progress>
      </div>
    </div>
  );
}

export default Uploader;
