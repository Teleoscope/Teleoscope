import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

export default function TheTable({ data }) {
  const headers = data?.length > 0 ? Object.keys(data[0]) : [];

  if (!data) {
    return (
        <></>
    )
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {headers.map(header => <TableCell key={`${index}-${header}`}>{row[header]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
