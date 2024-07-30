import { FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip } from '@mui/material';

interface MultiSelectProps {
  selectedHeaders: string[];
  setSelectedHeaders: (headers: string[]) => void;
  headers: string[];
}

export default function MultiSelect({ selectedHeaders, setSelectedHeaders, headers }: MultiSelectProps) {
  const handleChangeMultiple = (event: React.ChangeEvent<{ value: unknown }>) => {
    const { value } = event.target;
    setSelectedHeaders(typeof value === 'string' ? value.split(',') : value as string[]);
  };

  return (
    <FormControl fullWidth margin="normal">
      <InputLabel>Group Data By Columns</InputLabel>
      <Select
        multiple
        value={selectedHeaders}
        onChange={handleChangeMultiple}
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
  );
}
