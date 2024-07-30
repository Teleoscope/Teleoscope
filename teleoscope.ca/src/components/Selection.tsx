import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface SelectionProps {
  label: string;
  value: string;
  setValue: (value: string) => void;
  headers: string[];
}

export default function Selection({ label, value, setValue, headers }: SelectionProps) {
  return (
    <FormControl fullWidth margin="normal">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => setValue(e.target.value)}
      >
        {headers.map((header, index) => (
          <MenuItem key={index} value={header}>{header}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
